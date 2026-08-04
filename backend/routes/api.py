"""
REST API routes: dashboard stats, feedback, contact form, health check.
"""

import re
import time
import logging
from datetime import datetime
from flask import Blueprint, request, jsonify, g

from core.database import (
    game_results_collection, feedback_collection, contact_collection,
    rooms_collection, users_collection, redis_client,
    json_safe, rate_limit_ip
)
from middleware.auth import require_auth
from services.email_service import get_thank_you_email, send_contact_thankyou_email

logger = logging.getLogger(__name__)

api_bp = Blueprint("api", __name__)
BOOT_TIME = time.time()


@api_bp.route("/ping", methods=["GET"])
def ping():
    """Lightweight health check endpoint."""
    return jsonify({"status": "ok"}), 200


@api_bp.route("/", methods=["GET"])
def root_health():
    """Root health check."""
    return jsonify({"status": "memegame backend running"}), 200


@api_bp.route("/health", methods=["GET"])
@api_bp.route("/api/health", methods=["GET"])
def health_check():
    """
    Comprehensive diagnostic health check endpoint.
    Returns status, uptime, MongoDB latency, Redis mode, and active room/player stats.
    """
    status = "healthy"
    uptime_seconds = round(time.time() - BOOT_TIME, 2)

    # Check MongoDB ping and latency
    mongo_status = "up"
    mongo_latency_ms = 0.0
    try:
        t0 = time.time()
        rooms_collection.database.command("ping")
        mongo_latency_ms = round((time.time() - t0) * 1000, 2)
    except Exception as e:
        logger.error(f"[HEALTH] MongoDB ping failed: {e}")
        mongo_status = "down"
        status = "degraded"

    # Check Redis
    redis_status = "up" if redis_client else "down"
    redis_mode = "redis" if redis_client else "in-memory"
    if redis_client:
        try:
            redis_client.ping()
        except Exception as e:
            logger.warning(f"[HEALTH] Redis ping failed: {e}")
            redis_status = "down"
            redis_mode = "in-memory-fallback"

    # Stats
    try:
        active_rooms = rooms_collection.count_documents({})
        rooms_list = list(rooms_collection.find({}, {"players": 1}))
        active_players = sum(len([p for p in r.get("players", []) if p.get("isConnected", False)]) for r in rooms_list)
    except Exception as e:
        logger.error(f"[HEALTH] Could not compute stats: {e}")
        active_rooms = 0
        active_players = 0

    return jsonify({
        "status": status,
        "timestamp": datetime.utcnow().isoformat(),
        "uptime_seconds": uptime_seconds,
        "services": {
            "mongodb": {
                "status": mongo_status,
                "latency_ms": mongo_latency_ms
            },
            "redis": {
                "status": redis_status,
                "mode": redis_mode
            }
        },
        "stats": {
            "active_rooms": active_rooms,
            "active_players": active_players
        }
    }), 200 if status == "healthy" else 503


@api_bp.route("/api/user/dashboard-stats", methods=["GET", "OPTIONS"])
def get_dashboard_stats():
    """
    Get game statistics for the user (from JWT or query param userId).
    """
    if request.method == "OPTIONS":
        return jsonify({"success": True}), 200

    auth_header = request.headers.get("Authorization", "")
    user_id = None
    if auth_header.startswith("Bearer "):
        try:
            import jwt
            from core.database import JWT_SECRET_KEY
            token = auth_header.split(" ", 1)[1]
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=["HS256"])
            user_id = payload.get("id")
        except Exception:
            pass

    if not user_id:
        user_id = request.args.get("userId")

    if not user_id:
        return jsonify({"success": False, "error": "User ID required"}), 400

    try:
        total_games = game_results_collection.count_documents({"players.id": user_id})
        games_hosted = game_results_collection.count_documents({"host.id": user_id})
        total_wins = game_results_collection.count_documents({"winners.id": user_id})

        # Win rate in Universal Community Voting is total_wins / total_games (Hosts compete as players)
        win_rate_val = round((total_wins / total_games * 100), 1) if total_games > 0 else 0
        win_rate_str = f"{win_rate_val}%"

        # Fetch authoritative promptsCreated statistic from users_collection
        user_doc = None
        try:
            from bson.objectid import ObjectId
            user_doc = users_collection.find_one({"_id": ObjectId(user_id)})
        except Exception:
            pass
        if not user_doc:
            user_doc = users_collection.find_one({"_id": user_id})
        prompts_created = user_doc.get("promptsCreated", 0) if user_doc else 0

        # Best score aggregation
        pipeline = [
            {"$match": {"players.id": user_id}},
            {"$unwind": "$players"},
            {"$match": {"players.id": user_id}},
            {"$sort": {"players.score": -1}},
            {"$limit": 1},
            {"$project": {"maxScore": "$players.score", "totalRounds": "$totalRounds"}}
        ]
        score_result = list(game_results_collection.aggregate(pipeline))

        if score_result:
            best_score = f"{score_result[0].get('maxScore', 0)}"
            best_score_trend = f"in {score_result[0].get('totalRounds', 0)} Rounds"
        else:
            best_score = "0"
            best_score_trend = "0 Rounds"

        # Recent game history
        history_cursor = game_results_collection.find(
            {"players.id": user_id}
        ).sort("createdAt", -1).limit(5)

        history = []
        for doc in history_cursor:
            my_player_data = next((p for p in doc.get('players', []) if p.get('id') == user_id), {})
            history.append({
                "id": str(doc["_id"]),
                "roomId": doc.get("roomId"),
                "score": my_player_data.get('score', 0),
                "isWinner": any(w.get('id') == user_id for w in doc.get('winners', [])),
                "wasHost": doc.get('host', {}).get('id') == user_id,
                "date": doc.get("createdAt").strftime("%b %d, %Y") if doc.get("createdAt") else "Recent",
                "totalRounds": doc.get("totalRounds", 5),
                "winners": doc.get("winners", []),
                "bestSubmission": doc.get("bestSubmission"),
                "players": doc.get("players", [])
            })

        return jsonify({
            "success": True,
            "stats": {
                "totalGames": total_games,
                "gamesHosted": games_hosted,
                "promptsCreated": prompts_created,
                "totalWins": total_wins,
                "winRate": win_rate_str,
                "bestScoreDisplay": best_score,
                "bestScoreTrend": best_score_trend
            },
            "history": history
        })

    except Exception as e:
        logger.error(f"Dashboard Stats Error: {e}")
        return jsonify({"success": False, "error": "Error fetching stats"}), 500


@api_bp.route("/api/feedback", methods=["POST", "OPTIONS"])
def submit_feedback():
    """Submit game feedback."""
    if request.method == "OPTIONS":
        return jsonify({"success": True}), 200

    try:
        data = request.get_json() or {}
        rating = int(data.get("rating", 0))
        message = str(data.get("message", "")).strip()
        room_id = data.get("roomId")

        if rating < 1 or rating > 5:
            return jsonify({"success": False, "error": "Invalid rating"}), 400

        user_id = data.get("userId")
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            try:
                import jwt
                from core.database import JWT_SECRET_KEY
                token = auth_header.split(" ", 1)[1]
                payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=["HS256"])
                user_id = payload.get("id") or user_id
            except Exception:
                pass

        feedback_doc = {
            "rating": rating,
            "message": message,
            "roomId": room_id,
            "userId": user_id,
            "username": data.get("username"),
            "createdAt": datetime.utcnow()
        }

        feedback_collection.insert_one(feedback_doc)

        return jsonify({
            "success": True,
            "message": "Feedback received"
        }), 200

    except Exception as e:
        logger.error(f"[FEEDBACK ERROR] {str(e)}")
        return jsonify({"success": False, "error": "Server error"}), 500


@api_bp.route("/api/contact", methods=["POST"])
def handle_contact():
    """Public contact form submission with rate limiting."""
    try:
        data = request.get_json()
        name = data.get("name", "").strip()
        email = data.get("email", "").strip().lower()
        message = data.get("message", "").strip()

        if not name or not email or not message:
            return jsonify({"success": False, "error": "All fields are required."}), 400
        if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
            return jsonify({"success": False, "error": "Invalid email format."}), 400
        if len(message) < 10:
            return jsonify({"success": False, "error": "Message too short."}), 400

        ip = request.remote_addr or "unknown"
        if not rate_limit_ip(ip, period_seconds=60, max_requests=3):
            return jsonify({"success": False, "error": "Too many requests. Please wait and try again."}), 429

        if contact_collection.find_one({"email": email}):
            return jsonify({"success": False, "error": "You've already submitted a message with this email."}), 409

        contact_collection.insert_one({
            "name": name,
            "email": email,
            "message": message,
            "submitted_at": datetime.utcnow()
        })

        date_str = datetime.now().strftime("%A, %d %B %Y %I:%M %p")
        subject = f"🙌 Thanks for Contacting MemeGame! {date_str}"
        html_content = get_thank_you_email(name, message)
        send_contact_thankyou_email(email, subject, html_content)

        return jsonify({"success": True, "message": "Message sent successfully!"}), 200

    except Exception as e:
        logger.error(f"[CONTACT ERROR] {str(e)}")
        return jsonify({"success": False, "error": "Server error. Please try again later."}), 500
