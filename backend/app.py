import eventlet
eventlet.monkey_patch()


from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
import redis
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv
import os
import jwt
import random
from bson import ObjectId
from flask_socketio import disconnect
from flask_socketio import SocketIO, emit, join_room, leave_room
from datetime import datetime, timedelta
import logging
import re
from bson.json_util import dumps, loads
import requests
from services.email_service import get_thank_you_email
from services.email_service import send_registration_otp_email, send_professional_otp_email, send_email
from utils.auth_utils import validate_email_format
from utils.game_utils import generate_unique_room_id
from utils.session_utils import generate_session_id
from services.game_services import get_room_with_validation, get_player_and_room, update_and_broadcast_state
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load .env variables
load_dotenv()

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY") 
SENDER_EMAIL = os.getenv("SENDER_EMAIL")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")
GIPHY_API_KEY = os.getenv("GIPHY_API_KEY")

#client = MongoClient("mongodb://127.0.0.1:27017/")

MONGODB_URI = os.getenv("MONGODB_URI")
client = MongoClient(
    MONGODB_URI,
    serverSelectionTimeoutMS=5000,
    connectTimeoutMS=20000
)

db = client["memegame"]
users_collection = db["users"]
rooms_collection = db["rooms"]
otp_collection = db["otp_verifications"]
otp_collection.create_index("expires_at", expireAfterSeconds=0)
contact_collection = db["contact_messages"]
sessions_collection = db["sessions"]
game_results_collection = db["game_results"]

# Redis connection (for sessions, timers, rate-limits)
REDIS_URL = os.getenv("REDIS_URL")
redis_client: redis.Redis | None = None
local_socket_store = {} 
local_rejoin_store = {}

# UPDATE this block
if REDIS_URL:
    try:
        # Added timeouts so DNS issues don't lag your app
        redis_client = redis.from_url(
            REDIS_URL, 
            decode_responses=True, 
            socket_timeout=2, 
            socket_connect_timeout=2
        )
        logger.info("Redis connected successfully")
    except Exception as e:
        logger.error(f"Redis connection failed: {e}")


def rate_limit_ip(ip: str, period_seconds: int = 60, max_requests: int = 3) -> bool:
    key = f"rate:{ip}"
    try:
        if redis_client:
            current = redis_client.incr(key)
            if current == 1:
                redis_client.expire(key, period_seconds)
            return current <= max_requests
    except Exception as e:
        logger.error(f"Redis rate limit error: {e}")
    return True

def set_active_session(session_id: str, room_id: str, player_id: str):
    try:
        if redis_client:
            redis_client.hset(f"session:{session_id}", mapping={
                "roomId": room_id,
                "playerId": player_id,
                "lastSeen": datetime.utcnow().isoformat()
            })
            redis_client.sadd(f"room_sessions:{room_id}", session_id)
    except Exception as e:
        logger.error(f"Redis set_active_session error: {e}")

def delete_sessions_for_room(room_id: str):
    try:
        if redis_client:
            session_ids = redis_client.smembers(f"room_sessions:{room_id}") or []
            for sid in session_ids:
                redis_client.delete(f"session:{sid}")
            redis_client.delete(f"room_sessions:{room_id}")
    except Exception as e:
        logger.error(f"Redis delete_sessions_for_room error: {e}")

def delete_player_sessions(room_id: str, player_id: str):
    try:
        if redis_client:
            session_ids = redis_client.smembers(f"room_sessions:{room_id}") or []
            for sid in session_ids:
                sess = redis_client.hgetall(f"session:{sid}") or {}
                if sess.get("playerId") == player_id:
                    redis_client.delete(f"session:{sid}")
                    redis_client.srem(f"room_sessions:{room_id}", sid)
    except Exception as e:
        logger.error(f"Redis delete_player_sessions error: {e}")

# Timer management in Redis and eventlet-friendly background task
TIMER_PREFIX = "timer"

def broadcast_state(room_id, update_payload, phase):
    update_and_broadcast_state(
        room_id,
        update_payload,
        phase,
        rooms_collection,
        socketio,
        json_safe,
        logger
    )

def set_timer(room_id: str, end_time_iso: str, duration: int):
    try:
        if redis_client:
            redis_client.hset(f"{TIMER_PREFIX}:{room_id}", mapping={
                "end_time": end_time_iso,
                "duration": str(duration),
                "cancel": "0"
            })
    except Exception as e:
        logger.error(f"Redis set_timer error: {e}")

def cancel_timer(room_id: str):
    try:
        if redis_client:
            redis_client.hset(f"{TIMER_PREFIX}:{room_id}", "cancel", "1")
    except Exception as e:
        logger.error(f"Redis cancel_timer error: {e}")

def cleanup_room_runtime(room_id: str):
    """Purge all temporary data for a room."""
    try:
        # 1. Stop Redis timers
        if redis_client:
            redis_client.delete(f"{TIMER_PREFIX}:{room_id}")

        # 2. Clear Local Socket Store (The mapping we fixed earlier)
        global local_socket_store
        keys_to_remove = [sid for sid, data in local_socket_store.items() if data.get("roomId") == room_id]
        for sid in keys_to_remove:
            if sid in local_socket_store:
                del local_socket_store[sid]

        # 3. Final delete from active sessions
        if redis_client:
            delete_sessions_for_room(room_id)

        logger.info(f"[CLEANUP] Successfully purged room {room_id} from memory.")
    except Exception as e:
        logger.error(f"cleanup_room_runtime error: {e}")
        
def stop_room_active_logic(room_id: str):
    """Stop timers and active play, but keep the data for a few minutes."""
    if redis_client:
        redis_client.delete(f"{TIMER_PREFIX}:{room_id}")
    logger.info(f"Active logic stopped for {room_id}. Entering grace period.")


def set_socket_mapping(sid: str, room_id: str, player_id: str, session_id: str) -> None:
    data = {
        "roomId": room_id,
        "playerId": player_id,
        "sessionId": session_id,
        "lastSeen": datetime.utcnow().isoformat()
    }
    try:
        if redis_client:
            redis_client.hset(f"sock:{sid}", mapping=data)
            redis_client.expire(f"sock:{sid}", 24 * 3600)
            return
    except Exception as e:
        logger.error(f"set_socket_mapping error: {e}")
    
    # Fallback to local RAM
    local_socket_store[f"sock:{sid}"] = data

def get_socket_mapping(sid: str) -> dict:
    try:
        if redis_client:
            res = redis_client.hgetall(f"sock:{sid}")
            if res: return res
    except Exception as e:
        logger.error(f"get_socket_mapping error: {e}")
    
    # Fallback to local RAM
    return local_socket_store.get(f"sock:{sid}", {})

def set_rejoin_grace(session_id: str, ttl_seconds: int = 15) -> None:
    try:
        if redis_client:
            redis_client.setex(f"rejoin_grace:{session_id}", ttl_seconds, "1")
            return
    except Exception as e:
        logger.error(f"set_rejoin_grace error: {e}")
    
    # Fallback to local RAM
    local_rejoin_store[session_id] = True

def pop_rejoin_grace(session_id: str) -> bool:
    try:
        if redis_client:
            pipe = redis_client.pipeline()
            key = f"rejoin_grace:{session_id}"
            pipe.get(key)
            pipe.delete(key)
            val, _ = pipe.execute()
            if val: return True
    except Exception as e:
        logger.error(f"pop_rejoin_grace error: {e}")
    
    # Fallback to local RAM
    return local_rejoin_store.pop(session_id, False)

def clear_socket_mapping(sid: str) -> None:
    try:
        if redis_client:
            redis_client.delete(f"sock:{sid}")
    except Exception as e:
        logger.error(f"clear_socket_mapping error: {e}")
    
    # ALWAYS clear the local backup too
    local_socket_store.pop(f"sock:{sid}", None)
    
def finalize_game(room_id: str) -> dict | None:
    try:
        room = rooms_collection.find_one({"roomId": room_id})
        if not room: return None

        if room.get("gamePhase") not in ("results", "finalResults", "memeReveal"):
            logger.warning(f"[FINALIZE_SKIP] Room {room_id} is in phase {room.get('gamePhase')}")
            return None
        
        total_rounds = int(room.get("totalRounds", 0))
        current_round = int(room.get("currentRound", 0))
        
        if current_round < total_rounds: return None

        players = room.get("players", [])
        
        top_score = max(int(p.get("score", 0)) for p in players) if players else 0
        winners = [
            {
                "id": p.get("id"),
                "username": p.get("username"),
                "score": int(p.get("score", 0)),
                "avatar": p.get("avatar")
            } for p in players if int(p.get("score", 0)) == top_score
        ]

        host_data = room.get("host", {})
        host_id = host_data.get("id") if host_data else None

        result_doc = {
            "roomId": room_id,
            "host": host_data,
            "allJudges": [host_id] if host_id else [],
            "winners": winners,
            "players": [{
                "id": p.get("id"),
                "username": p.get("username"),
                "score": int(p.get("score", 0)),
                "avatar": p.get("avatar")
            } for p in players],
            "totalRounds": total_rounds,
            "createdAt": datetime.utcnow()
        }

        game_results_collection.update_one(
            {"roomId": room_id},
            {"$set": result_doc}, 
            upsert=True
        )

        rooms_collection.update_one(
            {"roomId": room_id},
            {"$set": {"status": "archived", "cleanupAt": datetime.utcnow() + timedelta(minutes=5)}}
        )

        return result_doc
    except Exception as e:
        logger.error(f"finalize_game error: {e}")
        return None
    

cors_origins = [
    "http://localhost:5173",
    "https://meme-game-six.vercel.app"
]

app = Flask(__name__)

CORS(
    app,
    resources={r"/api/*": {"origins": cors_origins}},
    supports_credentials=True
)

socketio = SocketIO(
    app,
    cors_allowed_origins=cors_origins,
    async_mode="eventlet",
    ping_timeout=40,
    ping_interval=20
)

@app.route("/ping", methods=["GET"])
def ping():
    logger.info("Health check ping received")
    return jsonify({"status": "ok"}), 200

@app.route("/api/contact", methods=["POST"])
def handle_contact():
    try:
        data = request.get_json()
        name = data.get("name", "").strip()
        email = data.get("email", "").strip().lower()
        message = data.get("message", "").strip()

        # 1. Validate inputs
        if not name or not email or not message:
            return jsonify({"success": False, "error": "All fields are required."}), 400

        if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
            return jsonify({"success": False, "error": "Invalid email format."}), 400

        if len(message) < 10:
            return jsonify({"success": False, "error": "Message too short."}), 400

        # 2. Rate-limit by IP (Redis)
        ip = request.remote_addr or "unknown"
        if not rate_limit_ip(ip, period_seconds=60, max_requests=3):
            return jsonify({"success": False, "error": "Too many requests. Please wait and try again."}), 429

        # 3. Check for duplicate email
        if contact_collection.find_one({"email": email}):
            return jsonify({"success": False, "error": "You've already submitted a message with this email."}), 409

        # 4. Store in MongoDB
        contact_collection.insert_one({
            "name": name,
            "email": email,
            "message": message,
            "submitted_at": datetime.utcnow()
        })

        # 5. Send Thank You email
        date_str = datetime.now().strftime("%A, %d %B %Y %I:%M %p")
        subject = f"🙌 Thanks for Contacting MemeGame! {date_str}"
        html_content = get_thank_you_email(name, message)

        send_email(email, subject, html_content)
        return jsonify({ "success": True, "message": "Message sent successfully!" }), 200

    except Exception as e:
        logger.error(f"[CONTACT ERROR] {str(e)}")
        return jsonify({ "success": False, "error": "Server error. Please try again later." }), 500


@app.route("/api/send-otp", methods=["POST"])
def send_otp():
    """
    Send a 6-digit OTP to the user's email.
    Body: { email: str, purpose?: 'register'|'login'|'reset' }
    - Stores OTP in Mongo `otp_verifications` with 5-min expiry
    - Rate-limit: 1 per minute per email
    - For 'register': allow if user doesn't exist
    - For 'login'/'reset': require existing user
    """

    request_start_time = datetime.utcnow()
    client_ip = request.environ.get('HTTP_X_FORWARDED_FOR', request.remote_addr)

    try:
        data = request.get_json() or {}
        email = str(data.get("email", "")).strip().lower()
        purpose = str(data.get("purpose", "login")).strip().lower()

        if not email:
            return jsonify({"error": "Email is required"}), 400
        if not validate_email_format(email):
            return jsonify({"error": "Invalid email format"}), 400
        if purpose not in {"register", "login", "reset"}:
            purpose = "login"

        # Per-email rate limit via Mongo timestamp (fallback if Redis unavailable)
        recent = otp_collection.find_one({
            "email": email,
            "created_at": {"$gte": datetime.utcnow() - timedelta(minutes=1)}
        })
        if recent:
            return jsonify({"error": "Please wait before requesting another OTP"}), 429

        user = users_collection.find_one({"email": email})
        if purpose in {"reset"} and not user:
            return jsonify({"error": "Email not registered"}), 404
        if purpose == "register" and user:
            return jsonify({"error": "User already exists"}), 409

        otp = str(random.randint(100000, 999999))
        expiry = datetime.utcnow() + timedelta(minutes=5)

        otp_collection.update_one(
            {"email": email},
            {"$set": {
                "email": email,
                "otp": otp,
                "expires_at": expiry,
                "created_at": datetime.utcnow(),
                "attempts": 0,
                "client_ip": client_ip,
                "is_used": False,
                "purpose": purpose
            }},
            upsert=True
        )

        user_name = (user or {}).get("username")
        logger.info(f"[OTP] Sending OTP to {email} for purpose={purpose}")
        if purpose == "register":
            email_success, email_message = send_registration_otp_email(email, otp, user_name)
        else:
            email_success, email_message = send_professional_otp_email(email, otp, user_name)
        if not email_success:
            logger.error(f"[OTP] Email send failed for {email}: {email_message}")
            return jsonify({"error": "Failed to send OTP. Try again later."}), 500

        return jsonify({"message": "OTP sent", "expires_in": 300}), 200
    except Exception as e:
        logger.error(f"[OTP] send_otp error: {e}")
        return jsonify({"error": "Server error"}), 500
     
        
@app.route("/api/verify-otp", methods=["POST"])
def verify_otp():
    try:
        data = request.get_json() or {}
        email = str(data.get("email", "")).strip().lower()
        otp = str(data.get("otp", "")).strip()
        purpose = str(data.get("purpose", "login")).strip().lower()
        username = data.get("username")
        password = data.get("password")

        if not email or not otp:
            return jsonify({"error": "Email and OTP are required"}), 400

        rec = otp_collection.find_one({"email": email})
        if not rec:
            return jsonify({"error": "OTP not requested"}), 400
        if rec.get("otp") != otp:
            otp_collection.update_one({"email": email}, {"$inc": {"attempts": 1}})
            return jsonify({"error": "Invalid OTP"}), 400
        if datetime.utcnow() > rec.get("expires_at", datetime.utcnow()):
            return jsonify({"error": "OTP expired"}), 400

        user = users_collection.find_one({"email": email})

        if purpose == "register":
            if user:
                return jsonify({"error": "User already exists"}), 409
            if not username or not password:
                return jsonify({"error": "Username and password required"}), 400
            hashed_password = generate_password_hash(password)
            avatar_url = f"https://api.dicebear.com/7.x/fun-emoji/svg?seed={username}"
            insert = users_collection.insert_one({
                "username": username,
                "email": email,
                "password": hashed_password,
                "avatar": avatar_url,
                "createdAt": datetime.utcnow()
            })
            user_id = str(insert.inserted_id)
            user = users_collection.find_one({"_id": insert.inserted_id})

        elif purpose == "reset":
            if not user:
                return jsonify({"error": "User not found"}), 404
            if not password:
                return jsonify({"error": "New password required"}), 400
            users_collection.update_one(
                {"email": email},
                {"$set": {"password": generate_password_hash(password)}}
            )
            otp_collection.delete_one({"email": email})
            return jsonify({"message": "Password updated successfully"}), 200

        else:
            if not user:
                return jsonify({"error": "User not found"}), 404
            user_id = str(user["_id"])

        otp_collection.delete_one({"email": email})

        token = jwt.encode({
            "email": email,
            "id": user_id,
            "exp": datetime.utcnow() + timedelta(days=7)
        }, JWT_SECRET_KEY, algorithm="HS256")

        payload_user = {
            "id": user_id,
            "username": user.get("username"),
            "email": user.get("email"),
            "avatar": user.get("avatar")
        }

        if purpose == "register":
            try:
                now = datetime.now()
                formatted_time = now.strftime("%b %d, %Y %I:%M %p")
                subject = f"Welcome to MemeGame 🎉  |  {formatted_time}"
                body = f"Welcome {user.get('username','player')} to MemeGame!"
                send_email(email, subject, body)
            except Exception:
                pass

        return jsonify({"token": token, "user": payload_user}), 200

    except Exception as e:
        logger.error(f"[AUTH] verify_otp error: {e}")
        return jsonify({"error": "Server error"}), 500


@app.route("/api/register", methods=["POST"])
def register():
    """
    Begin registration: validate inputs, ensure email unused, send OTP.
    Does not create user yet; user is created in /api/verify-otp after OTP verification with purpose=register.
    """
    data = request.get_json() or {}
    username = str(data.get("username", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", "")).strip()

    if not username or not email or not password:
        return jsonify({"error": "All fields are required"}), 400
    if users_collection.find_one({"email": email}):
        return jsonify({"error": "User already exists"}), 409

    # Generate and send registration OTP using dedicated welcome template
    otp = str(random.randint(100000, 999999))
    expiry = datetime.utcnow() + timedelta(minutes=5)
    otp_collection.update_one(
        {"email": email},
        {"$set": {
            "email": email,
            "otp": otp,
            "expires_at": expiry,
            "created_at": datetime.utcnow(),
            "attempts": 0,
            "client_ip": request.remote_addr,
            "is_used": False,
            "purpose": "register"
        }},
        upsert=True
    )
    email_success, msg = send_registration_otp_email(email, otp, username)
    if not email_success:
        logger.error(f"[REGISTER] Failed to send registration OTP: {msg}")
        return jsonify({"error": "Failed to send OTP"}), 500
    logger.info(f"[REGISTER] Registration OTP sent to {email}")
    return jsonify({"message": "OTP sent to email for registration"}), 200

    
@app.route('/api/user/dashboard-stats', methods=['GET'])
def get_dashboard_stats():
    user_id = request.args.get('userId') 
    if not user_id:
        return jsonify({"success": False, "message": "User ID required"}), 400

    try:
        # 1. Total Games (Any game where they were in the room)
        total_games = game_results_collection.count_documents({"players.id": user_id})
        
        # 2. Games Hosted = Times as Judge (Since host is permanent judge)
        games_hosted = game_results_collection.count_documents({"host.id": user_id})
        
        # 3. Games Won
        total_wins = game_results_collection.count_documents({"winners.id": user_id})
        
        games_as_player = total_games - games_hosted
        win_rate_val = round((total_wins / games_as_player * 100), 1) if games_as_player > 0 else 0
        win_rate_str = f"{win_rate_val}%"

        pipeline = [
            {"$match": {"players.id": user_id}},
            {"$unwind": "$players"},
            {"$match": {"players.id": user_id}},
            {"$sort": {"players.score": -1}}, # Get highest score first
            {"$limit": 1}, # Only take the top 1
            {"$project": {"maxScore": "$players.score", "totalRounds": "$totalRounds"}}
        ]
        score_result = list(game_results_collection.aggregate(pipeline))
        
        if score_result:
            best_score = f"{score_result[0].get('maxScore', 0)}"
            best_score_trend = f"in {score_result[0].get('totalRounds', 0)} Rounds"
        else:
            best_score = "0"
            best_score_trend = "0 Rounds"

        # 6. Recent History (Unchanged)
        history_cursor = game_results_collection.find(
            {"players.id": user_id}
        ).sort("createdAt", -1).limit(5)
        
        history = []
        for doc in history_cursor:
            my_player_data = next((p for p in doc['players'] if p['id'] == user_id), {})
            history.append({
                "id": str(doc["_id"]),
                "roomId": doc.get("roomId"),
                "score": my_player_data.get('score', 0),
                "isWinner": any(w['id'] == user_id for w in doc.get('winners', [])),
                "wasHost": doc.get('host', {}).get('id') == user_id,
                "date": doc.get("createdAt").strftime("%b %d") if doc.get("createdAt") else "Recent"
            })

        return jsonify({
            "success": True,
            "stats": {
                "totalGames": total_games,
                "gamesHosted": games_hosted,
                "totalWins": total_wins,
                "winRate": win_rate_str,
                "bestScoreDisplay": best_score,
                "bestScoreTrend": best_score_trend
            },
            "history": history
        })

    except Exception as e:
        logger.error(f"Dashboard Stats Error: {e}")
        return jsonify({"success": False, "message": "Error fetching stats"}), 500
    
@app.route("/api/login", methods=["POST"])
def login():
    try:
        data = request.get_json() or {}
        email = str(data.get("email", "")).strip().lower()
        password = data.get("password")
        client_ip = request.environ.get("HTTP_X_FORWARDED_FOR", request.remote_addr)

        if not email or not password:
            return jsonify({"error": "Invalid email or password"}), 400

        if not rate_limit_ip(client_ip, period_seconds=60, max_requests=5):
            return jsonify({"error": "Too many login attempts. Try again later."}), 429

        user = users_collection.find_one({"email": email})

        if not user or not check_password_hash(user.get("password"), password):
            return jsonify({"error": "Invalid email or password"}), 401

        users_collection.update_one(
            {"_id": user["_id"]},
            {"$set": {"last_login": datetime.utcnow()}}
        )

        token = jwt.encode({
            "email": email,
            "id": str(user["_id"]),
            "exp": datetime.utcnow() + timedelta(days=7)
        }, JWT_SECRET_KEY, algorithm="HS256")

        return jsonify({
            "token": token,
            "user": {
                "id": str(user["_id"]),
                "username": user.get("username"),
                "email": user.get("email"),
                "avatar": user.get("avatar")
            }
        }), 200

    except Exception as e:
        logger.error(f"[AUTH] login error: {e}")
        return jsonify({"error": "Server error"}), 500


def cleanup_old_sessions():
    """Clean up sessions older than 24 hours (Redis-backed)"""
    try:
        if redis_client:
            # No-op: session TTL handled separately when setting or not needed
            return
    except Exception as e:
        logger.error(f"cleanup_old_sessions error: {e}")

def update_player_connection_status(room_id, player_id, is_connected=True):
    """Update player connection status in the room"""
    rooms_collection.update_one(
        {"roomId": room_id, "players.id": player_id},
        {"$set": {"players.$.isConnected": is_connected, "players.$.lastSeen": datetime.utcnow()}}
    )



def validate_player_in_room(room, player_id):
    """Validate that player is in the room"""
    return any(p["id"] == player_id for p in room.get("players", []))


def json_safe(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    elif isinstance(obj, ObjectId):
        return str(obj)
    elif isinstance(obj, list):
        return [json_safe(item) for item in obj]
    elif isinstance(obj, dict):
        return {key: json_safe(value) for key, value in obj.items()}
    return obj


# -------------------------------------------------------------------
# SOCKET.IO EVENTS: CONNECTION & LOBBY
# -------------------------------------------------------------------

@socketio.on('connect')
def handle_connect():
    """Handle client connection"""
    logger.info(f"[CONNECT] Client connected: {request.sid}")

@socketio.on('rejoinRoom')
def handle_rejoin(data):
    sid = request.sid
    room_id = data.get('roomId')
    session_id = data.get('sessionId')
    user_id = data.get('userId')

    # 1. Check the 15-second grace period
    if not pop_rejoin_grace(session_id):
        logger.warning(f"[REJOIN_FAIL] Grace period expired/invalid: {session_id}")
        emit('error', {'code': 'SESSION_EXPIRED', 'message': 'Reconnection timed out'})
        return

    # 2. Verify the session exists in Redis
    session_data = {}
    if redis_client:
        session_data = redis_client.hgetall(f"session:{session_id}") or {}

    # 3. Security Check: Block if data doesn't match
    if session_data.get('roomId') != room_id or session_data.get('playerId') != user_id:
        logger.warning(f"[REJOIN_FAIL] Data mismatch for session {session_id}")
        emit('error', {'code': 'INVALID_SESSION', 'message': 'Session mismatch'})
        return

    # 4. SUCCESS: Link the Socket
    set_socket_mapping(sid, room_id, user_id, session_id)
    join_room(room_id)

    # 5. Update MongoDB (Player is BACK)
    rooms_collection.update_one(
        {"roomId": room_id, "players.id": user_id},
        {"$set": {"players.$.isConnected": True, "players.$.lastSeen": datetime.utcnow()}}
    )

    # 6. Send the latest state
    room = rooms_collection.find_one({"roomId": room_id})
    if room:
        emit('gameStateUpdate', json_safe(room))
        socketio.emit('playerReconnected', {'playerId': user_id}, to=room_id)

    logger.info(f"[REJOIN_SUCCESS] Player {user_id} re-linked to room {room_id}")

@socketio.on("disconnect")
def handle_disconnect():
    """Handle client disconnection with prioritized RAM cleanup and DB purging."""
    sid = request.sid
    logger.info(f"[DISCONNECT] Client disconnected: {sid}")

    try:
        # 1. Fetch session mapping
        session = get_socket_mapping(sid)
        
        # 2. PRIORITY RAM CLEANUP: Always remove from local_socket_store immediately
        if sid in local_socket_store:
            del local_socket_store[sid]
            logger.info(f"[RAM_CLEANUP] Purged sid {sid} from memory store.")

        if not session:
            logger.info(f"[INFO] Disconnect cleanup finished (no session mapping): {sid}")
            return

        # Helper to handle byte-decoding and CamelCase vs snake_case naming
        def _val(key: str) -> str:
            v = session.get(key) or session.get(key.encode())
            # If primary key not found, check for common naming alternatives
            if not v:
                alt = "session_id" if key == "sessionId" else "sessionId"
                v = session.get(alt) or session.get(alt.encode())
            
            if isinstance(v, bytes):
                return v.decode()
            return v or ""

        room_id = _val("roomId")
        player_id = _val("playerId")
        session_id = _val("sessionId")

        # Validate we have enough data to update the Database
        if not all([room_id, player_id, session_id]):
            logger.warning(f"[INFO] Incomplete session data on disconnect: {session}")
            return

        # 3. DATABASE UPDATE: Mark player as disconnected
        rooms_collection.update_one(
            {"roomId": room_id, "players.id": player_id},
            {"$set": {"players.$.isConnected": False, "players.$.lastSeen": datetime.utcnow()}}
        )
        logger.info(f"[DISCONNECT] Updated DB for player {player_id}")

        # 4. ROOM STATUS CHECK
        room = rooms_collection.find_one({"roomId": room_id})
        if not room:
            return

        # 5. AUTO-PURGE LOGIC: If no one is connected anymore, kill the room
        active_players = [p for p in room["players"] if p.get("isConnected", False)]
        if not active_players:
            logger.info(f"[CLEANUP] Room {room_id} is now empty. Purging all database records.")
            rooms_collection.delete_one({"roomId": room_id})
            sessions_collection.delete_many({"roomId": room_id})
            cleanup_room_runtime(room_id)
            return

        # 6. HOST MIGRATION LOGIC (Only runs if players are still in the room)
        host_id = room.get("host", {}).get("id")
        new_host_assigned = False
        
        if player_id == host_id:
            logger.warning(f"[HOST_MIGRATE] Host {player_id} left. Attempting migration in {room_id}")
            
            # Find the next available player who is currently connected
            new_host = next((p for p in room["players"] if p["id"] != host_id and p.get("isConnected", True)), None)
            
            if new_host:
                logger.info(f"[HOST_MIGRATE] Promoting {new_host['username']} ({new_host['id']}) to Host")
                new_host["isHost"] = True
                
                # Update player status and room host reference in one go
                rooms_collection.update_one(
                    {"roomId": room_id, "players.id": new_host["id"]},
                    {"$set": {"players.$.isHost": True}}
                )
                rooms_collection.update_one(
                    {"roomId": room_id},
                    {"$set": {"host": new_host}}
                )
                new_host_assigned = True
            else:
                # No active players left to promote; technically redundant due to Step 5 but safe
                logger.warning(f"[HOST_MIGRATE] No one to promote. Discarding room {room_id}")
                rooms_collection.delete_one({"roomId": room_id})
                cleanup_room_runtime(room_id)
                return

        # 7. BROADCAST UPDATE: Sync remaining clients
        updated_room = rooms_collection.find_one({"roomId": room_id})
        if updated_room:
            if new_host_assigned:
                # Full state update so new host gets their UI buttons
                broadcast_state(room_id, {}, updated_room.get("gamePhase", "lobby"))
            else:
                # Simple disconnection notice for player icons
                socketio.emit('playerDisconnected', {
                    "players": json_safe(updated_room.get("players", [])),
                    "disconnectedPlayerId": player_id
                }, to=room_id)

        # 8. FINAL CLEANUP
        set_rejoin_grace(session_id, 15)
        clear_socket_mapping(sid)

    except Exception as e:
        logger.error(f"[ERROR] Exception in handle_disconnect: {e}")

@socketio.on('createRoom')
def handle_create_room(data):
    """Create a new game room"""
    sid = request.sid
    logger.debug(f"[DEBUG] 'createRoom' event from {sid}: {data}")

    try:
        host = data.get("host")
        if not host:
            emit("error", {"error": "Missing host data", "code": "MISSING_DATA"}, to=sid)
            return

        host_data = {
            "id": host.get("id"),
            "username": host.get("username"),
            "avatar": host.get("avatar"),
            "isHost": True,
            "isConnected": True,
            "lastSeen": datetime.utcnow(),
            "score": 0,
            "roundScores": [],
            "isJudge": False,
            "isReady": True, # ⭐️ FIX: Host is ready by default
        }
        
        room_id = generate_unique_room_id(rooms_collection)
        session_id = generate_session_id()
        
        room_data = {
            "roomId": room_id,
            "host": host_data,
            "players": [host_data],
            "totalRounds": int(data.get("rounds", 10)),
            "roundsPerJudge": int(data.get("roundsPerJudge", 1)),
            "currentRound": 0,
            "gamePhase": "lobby",
            "currentJudge": None,
            "currentSentence": None,
            "submissions": [],
            "createdAt": datetime.utcnow(),
            "lastActivity": datetime.utcnow()
        }
        insert_result = rooms_collection.insert_one(room_data)

        sessions_collection.update_one(
            {"sessionId": session_id},
            {"$set": {
                "sessionId": session_id, "roomId": room_id, "playerId": host_data["id"],
                "lastSeen": datetime.utcnow(), "isHost": True
            }},
            upsert=True
        )

        set_active_session(session_id, room_id, host_data["id"])
        
        # Map the host's socket ID (sid) to their player/room
        set_socket_mapping(sid, room_id, host_data["id"], session_id)

        join_room(room_id)
        logger.info(f"[CREATE] Host {host_data['id']} created room {room_id} and mapped to {sid}")

        room_data["_id"] = str(insert_result.inserted_id)
        emit('roomCreated', {
            "roomData": json_safe(room_data),
            "sessionId": session_id
        }, to=sid)

    except Exception as e:
        logger.error(f"[ERROR] Error in createRoom: {str(e)}")
        emit("error", {"error": "Failed to create room", "code": "CREATE_ROOM_FAILED"}, to=sid)

@socketio.on('joinRoom')
def handle_join_room(data):
    """A single, unified handler for joining a room."""
    sid = request.sid
    logger.debug(f"[DEBUG] 'joinRoom' event from {sid}: {data}")
    
    try:
        room_id = data.get("roomId")
        player_data = data.get("player") # Player data from client
        player_id = player_data.get("id")
        provided_session_id = data.get("sessionId")

        if not room_id or not player_data or not player_id:
            emit("error", {"error": "Room ID and player info required", "code": "MISSING_DATA"}, to=sid)
            return

        rejoined_from_grace = False
        if provided_session_id and pop_rejoin_grace(provided_session_id):
            rejoined_from_grace = True
            logger.info(f"[REJOIN] Player {player_id} reconnected within grace period")

        room, error = get_room_with_validation(room_id, rooms_collection)
        if error:
            emit("error", {"error": error, "code": "ROOM_NOT_FOUND"}, to=sid)
            return

        game_started = room.get("gamePhase") != "lobby"
        session_id = provided_session_id
        
        existing_idx = next((i for i, p in enumerate(room.get("players", [])) if p["id"] == player_id), None)

        if existing_idx is not None:
            # PATH A: Player is REJOINING (this is what the host does after creating)
            logger.info(f"[REJOIN] Player {player_id} is rejoining room {room_id}")
            existing_player = room["players"][existing_idx]
            existing_player["isConnected"] = True
            existing_player["lastSeen"] = datetime.utcnow()
            
            if not session_id:
                session_id = existing_player.get("sessionId") or generate_session_id()
            existing_player["sessionId"] = session_id
            
            # ⭐️ FIX: Ensure rejoining players are marked as ready
            existing_player["isReady"] = True 
            
            room["players"][existing_idx] = existing_player
            
            rooms_collection.update_one(
                {"roomId": room_id},
                {"$set": {f"players.{existing_idx}": existing_player, "lastActivity": datetime.utcnow()}}
            )

        else:
            # PATH B: Player is JOINING FRESH
            if game_started:
                emit("error", {"error": "Game has already started", "code": "GAME_ALREADY_STARTED"}, to=sid)
                return
            
            logger.info(f"[JOIN] New player {player_id} joining room {room_id}")
            session_id = provided_session_id or generate_session_id()
            new_player = {
                "id": player_id,
                "username": player_data.get("username"),
                "avatar": player_data.get("avatar"),
                "isHost": False,
                "isConnected": True,
                "lastSeen": datetime.utcnow(),
                "score": 0,
                "roundScores": [],
                "isJudge": False,
                "sessionId": session_id,
                # ⭐️ FIX: Set 'isReady' from client data
                "isReady": player_data.get("isReady", True), 
            }
            
            rooms_collection.update_one(
                {"roomId": room_id},
                {"$push": {"players": new_player}, "$set": {"lastActivity": datetime.utcnow()}}
            )

        # 4. DATABASE & REDIS UPDATES
        
        sessions_collection.update_one(
            {"sessionId": session_id},
            {"$set": {
                "sessionId": session_id, "roomId": room_id, "playerId": player_id,
                "lastSeen": datetime.utcnow(), "isHost": False
            }},
            upsert=True
        )

        sessions_collection.delete_many({
            "roomId": room_id, "playerId": player_id, "sessionId": {"$ne": session_id}
        })

        # CRITICAL: Map socket ID (for both rejoin and new join)
        set_socket_mapping(sid, room_id, player_id, session_id)
        set_active_session(session_id, room_id, player_id)
        logger.info(f"[AUTH] Mapped {sid} to {player_id} in {room_id}")

        # 5. EMIT UPDATES
        join_room(room_id)
        logger.info(f"[JOIN] Socket {sid} joined room {room_id}")

        updated_room = rooms_collection.find_one({"roomId": room_id})

        if existing_idx is not None or rejoined_from_grace:
            emit('playerReconnected', {
                "players": json_safe(updated_room.get("players", [])),
                "reconnectedPlayerId": player_id
            }, to=room_id, skip_sid=sid)
        else:
            emit("playerJoined", {
                "players": json_safe(updated_room.get("players", []))
            }, to=room_id, skip_sid=sid)

        emit("roomJoined", {
            "roomData": json_safe(updated_room),
            "sessionId": session_id
        }, to=sid)

    except Exception as e:
        logger.error(f"[ERROR] Error in joinRoom: {str(e)}")
        emit("error", {"error": "Failed to join room", "code": "JOIN_FAILED"}, to=sid)

@socketio.on('startGame')
def handle_start_game(data):
    """
    Host starts the game and automatically becomes the permanent Judge.
    Transitions directly to 'sentenceCreation' phase.
    """
    sid = request.sid
    try:
        room_id = data.get("roomId")
        player, room, error = get_player_and_room(
                sid,
                room_id,
                rooms_collection,
                get_socket_mapping,
                logger
            )
        
        if error:
            emit("error", {"error": error, "code": "AUTH_ERROR"}, to=sid)
            return

        if not player.get("isHost"):
            emit("error", {"error": "Only the host can start the game", "code": "NOT_HOST"}, to=sid)
            return

        players = room.get("players", [])
        if len(players) < 2: 
            emit("error", {"error": "Not enough players to start", "code": "NOT_ENOUGH_PLAYERS"}, to=sid)
            return
            
        # Check if all players are ready
        if not all(p.get("isReady", False) for p in players):
            emit("error", {"error": "Not all players are ready", "code": "PLAYERS_NOT_READY"}, to=sid)
            return

        host_judge = None
        updated_players = []
        
        # ⭐️ FIX: Automatically make the host the judge forever
        for p in players:
            p["score"] = 0
            p["roundScores"] = []
            p["isJudge"] = p.get("isHost", False) # Host = True, Everyone else = False
            
            if p["isJudge"]:
                host_judge = p
                
            updated_players.append(p)

        initial_update = {
            "$set": {
                "currentRound": 1,
                "currentJudge": host_judge, # Lock the host in as the judge
                "currentSentence": None,
                "submissions": [],
                "players": updated_players,
            }
        }
        
        broadcast_state(room_id, initial_update, "sentenceCreation")

    except Exception as e:
        logger.error(f"[ERROR] Error in startGame: {e}")
        emit("error", {"error": "Failed to start game", "code": "START_GAME_FAILED"}, to=sid)

def get_memes_from_giphy():
    try:
        if not GIPHY_API_KEY:
            logger.warning("No GIPHY_API_KEY configured")

        url = "https://api.giphy.com/v1/gifs/search"

        params = {
            "api_key": GIPHY_API_KEY,
            "q": "reaction",
            "limit": 50,
            "rating": "pg-13",
            "lang": "en"
        }

        response = requests.get(url, params=params, timeout=5)

        if response.status_code != 200:
            logger.error(f"GIPHY API failed with status {response.status_code}")
            return []

        payload = response.json()
        data = payload.get("data", [])

        if not data:
            logger.warning("GIPHY returned empty results")
            return []

        formatted_memes = []

        for meme_data in data:
            try:
                formatted_memes.append({
                    "id": meme_data["id"],
                    "url": meme_data["images"]["fixed_height"]["url"],
                    "title": meme_data.get("title") or "Meme"
                })
            except Exception:
                continue

        if not formatted_memes:
            logger.warning("No valid memes formatted from GIPHY response")
            return []

        return random.sample(
            formatted_memes,
            min(len(formatted_memes), 18)
        )

    except Exception as e:
        logger.error(f"GIPHY API error: {e}")
        return []


@socketio.on('submitSentence')
def handle_submit_sentence(data):
    """
    Judge submits a sentence.
    Fetches 10 random memes from GIPHY.
    Moves game to 'memeSelection' phase and starts a timer.
    """
    sid = request.sid
    try:
        room_id = data.get("roomId")
        sentence = data.get("sentence")

        if not sentence:
            emit("error", {"error": "Sentence cannot be empty", "code": "MISSING_DATA"}, to=sid)
            return

        player, room, error = get_player_and_room(
            sid,
            room_id,
            rooms_collection,
            get_socket_mapping,
            logger
        )
        if error:
            emit("error", {"error": error, "code": "AUTH_ERROR"}, to=sid)
            return

        current_judge_id = room.get("currentJudge", {}).get("id")
        if not player.get("isJudge") or player.get("id") != current_judge_id:
            emit("error", {"error": "Only the judge can submit a sentence", "code": "NOT_JUDGE"}, to=sid)
            return

        # ⭐️ --- NEW LOGIC TO FIX LAG --- ⭐️
        # Call our new function to get 10 memes from the web
        random_memes = get_memes_from_giphy()
        # ⭐️ ------------------------------ ⭐️

        sentence_update = {
            "$set": {
                "currentSentence": sentence,
                "submissions": [],
                "availableMemes": random_memes # ⭐️ ADDED: Store the 10 memes
            }
        }

        start_game_timer(room_id, 45)
        broadcast_state(room_id, sentence_update, "memeSelection")

    except Exception as e:
        logger.error(f"[ERROR] Error in submitSentence: {str(e)}")
        emit("error", {"error": "Failed to submit sentence", "code": "SUBMIT_SENTENCE_FAILED"}, to=sid)

@socketio.on('selectMeme')
def handle_select_meme(data):
    sid = request.sid
    try:
        room_id = data.get("roomId")
        meme_id = data.get("memeId") 

        player, room, error = get_player_and_room(
            sid,
            room_id,
            rooms_collection,
            get_socket_mapping,
            logger
        )
        if error:
            emit("error", {"error": error, "code": "AUTH_ERROR"}, to=sid)
            return

        if player.get("isJudge"):
            emit("error", {"error": "Judge cannot submit memes", "code": "JUDGE_CANNOT_SUBMIT"}, to=sid)
            return
            
        submissions = room.get("submissions", [])
        if any(s["playerId"] == player["id"] for s in submissions):
            emit("error", {"error": "You have already submitted", "code": "ALREADY_SUBMITTED"}, to=sid)
            return

        available_memes = room.get("availableMemes", [])
        
        # Finding the meme object from the list we generated at the start of the round
        selected_meme_obj = next((m for m in available_memes if m["id"] == meme_id), None)
        
        if not selected_meme_obj:
            logger.error(f"[DATA_ERROR] Room {room_id}: Submitted ID {meme_id} not in available list.")
            emit("error", {"error": "Invalid meme data submitted.", "code": "INVALID_MEME"}, to=sid)
            return

        # NEW CHANGE: Separated memeId and memeUrl so the Frontend knows what to render
        new_submission = {
            "playerId": player["id"],
            "username": player["username"],
            "avatar": player.get("avatar"),
            "memeId": selected_meme_obj["id"],    # The GIPHY ID string
            "memeUrl": selected_meme_obj["url"],  # UPDATED: Explicit field for the .gif link
            "title": selected_meme_obj.get("title", "Meme"),
            "score": 0                             # Changed from None to 0 for easier math
        }
        
        result = rooms_collection.find_one_and_update(
            {"roomId": room_id},
            {"$push": {"submissions": new_submission}},
            return_document=True
        )
        
        new_submissions = result.get("submissions", [])
        players = result.get("players", [])
        non_judge_players = [p for p in players if not p.get("isJudge")]
        
        all_submitted = len(new_submissions) >= len(non_judge_players)
        update_payload = {"$set": {"submissions": new_submissions}}

        if all_submitted:
            logger.info(f"[GAME] All players submitted in {room_id}. Moving to reveal.")
            stop_game_timer(room_id)
            broadcast_state(room_id, update_payload, "memeReveal")
        else:
            broadcast_state(room_id, update_payload, "memeSelection")
            
    except Exception as e:
        logger.error(f"[ERROR] Error in selectMeme: {str(e)}")
        emit("error", {"error": "Failed to select meme", "code": "SELECT_MEME_FAILED"}, to=sid)


@socketio.on('scoreMeme')
def handle_score_meme(data):
    """Judge scores a meme."""
    sid = request.sid
    try:
        room_id = data.get("roomId")
        player_id_to_score = data.get("playerId")
        score = int(data.get("score", 0))

        player, room, error = get_player_and_room(
            sid,
            room_id,
            rooms_collection,
            get_socket_mapping,
            logger
        )
        if error:
            emit("error", {"error": error, "code": "AUTH_ERROR"}, to=sid)
            return
            
        if not player.get("isJudge"):
            emit("error", {"error": "Only the judge can score", "code": "NOT_JUDGE"}, to=sid)
            return

        current_round = room.get("currentRound", 1)
        total_rounds = room.get("totalRounds", 3) # Defaulting to 3 if not found
        submissions = room.get("submissions", [])
        
        # Find and update the specific submission
        submission_updated = False
        for sub in submissions:
            if sub["playerId"] == player_id_to_score:
                if sub.get("score") is not None and sub.get("score") != 0:
                    emit("error", {"error": "Meme already scored", "code": "ALREADY_SCORED"}, to=sid)
                    return
                sub["score"] = score
                submission_updated = True
                break
        
        if not submission_updated:
            emit("error", {"error": "Submission not found", "code": "SUBMISSION_NOT_FOUND"}, to=sid)
            return

        # 1. Update submissions and player scores in DB
        rooms_collection.update_one(
            {"roomId": room_id},
            {"$set": {"submissions": submissions}}
        )
        
        rooms_collection.update_one(
            {"roomId": room_id, "players.id": player_id_to_score},
            {"$inc": {"players.$.score": score}}
        )

        # 2. Check if every player in this round has been scored
        all_scored = all(s.get("score") is not None and s.get("score") != 0 for s in submissions)
        
        if all_scored:
            # ⭐️ NEW LOGIC: Check if this was the FINAL round ⭐️
            if current_round >= total_rounds:
                logger.info(f"[GAME_OVER] Final round completed in {room_id}. Finalizing...")
                
                # Call your finalize function to save to MongoDB history
                finalize_game(room_id) 
                
                # Move to the Final Results screen
                broadcast_state(room_id, {}, "finalResults")
            else:
                logger.info(f"[ROUND_OVER] Round {current_round} done. Moving to results.")
                broadcast_state(room_id, {}, "results")
        else:
            broadcast_state(room_id, {}, "memeReveal")
        
    except Exception as e:
        logger.error(f"[ERROR] Error in scoreMeme: {str(e)}")
        emit("error", {"error": "Failed to score meme", "code": "SCORE_MEME_FAILED"}, to=sid)


@socketio.on('nextRound')
def handle_next_round(data):
    """Host triggers the next round."""
    sid = request.sid
    try:
        room_id = data.get("roomId")
        
        player, room, error = get_player_and_room(
            sid,
            room_id,
            rooms_collection,
            get_socket_mapping,
            logger
        )
        if error:
            emit("error", {"error": error, "code": "AUTH_ERROR"}, to=sid)
            return
            
        if not player.get("isHost"):
            emit("error", {"error": "Only the host can start the next round", "code": "NOT_HOST"}, to=sid)
            return

        current_round = room.get("currentRound", 0)
        total_rounds = room.get("totalRounds", 10)
        
        if current_round >= total_rounds:
            # GAME OVER
            logger.info(f"[GAME] Game ended in {room_id}. Moving to final results.")
            result_doc = finalize_game(room_id) # Assumes this function exists
            final_update = {}
            if result_doc:
                final_update["$set"] = {"finalResult": result_doc}
            broadcast_state(room_id, final_update, "finalResults")
            
        else:
            # START NEXT ROUND
            next_round_num = current_round + 1
            logger.info(f"[GAME] Starting round {next_round_num} in {room_id}.")
            
            host_judge = room.get("host", player) 
            
            next_round_update = {
                "$set": {
                    "currentRound": next_round_num,
                    "currentJudge": host_judge, 
                    "currentSentence": None,   
                    "submissions": [],          
                }
            }

            broadcast_state(room_id, next_round_update, "sentenceCreation")
            
    except Exception as e:
        logger.error(f"[ERROR] Error in nextRound: {str(e)}")
        emit("error", {"error": "Failed to start next round", "code": "NEXT_ROUND_FAILED"}, to=sid)

@socketio.on('chatMessage')
def handle_chat_message(data):
    """Handle chat messages with explicit key checking"""
    sid = request.sid
    try:
        # 1. Capture the data with fallback for both naming styles
        room_id = data.get("roomId") or data.get("room_id")
        message_body = data.get("message")
        
        # LOG: See what the backend is actually receiving
        logger.info(f"[CHAT_DEBUG] Received message from {sid} for Room: {room_id}")

        if not room_id or not message_body:
            logger.warning(f"[CHAT_WARN] Missing keys! Room: {room_id}, Msg Body: {bool(message_body)}")
            return

        # 2. Authenticate the sender (using the helper we fixed earlier)
        player, room, error = get_player_and_room(
            sid,
            room_id,
            rooms_collection,
            get_socket_mapping,
            logger
        )
        if error:
            logger.warning(f"[CHAT_AUTH_ERROR] {sid} in {room_id}: {error}")
            return
        
        # 3. Construct the final object (matching your Frontend's ChatMessage type)
        final_payload = {
            "id": message_body.get("id"),
            "username": player.get("username", "Player"),
            "message": message_body.get("message"), # The actual string text
            "timestamp": message_body.get("timestamp"),
            "userId": player.get("id"),
            "playerId": player.get("id")
        }

        # 4. Blast it to the room
        emit('chatMessage', final_payload, to=room_id)
        logger.info(f"[CHAT_SUCCESS] Message broadcasted to room {room_id}")
        
    except Exception as e:
        logger.error(f"[CHAT_EXCEPTION] Critical error: {str(e)}")

@socketio.on('leaveRoom')
def handle_leave_room(data):
    """A player explicitly clicks 'Leave Room'"""
    sid = request.sid
    try:
        room_id = data.get('roomId')
        player, room, error = get_player_and_room(
            sid,
            room_id,
            rooms_collection,
            get_socket_mapping,
            logger
        )
        
        if error:
            logger.info(f"[LEAVE] Player {sid} tried to leave, but: {error}")
            return
            
        logger.info(f"[LEAVE] Player {player['id']} is leaving room {room_id}")

        rooms_collection.update_one(
            {"roomId": room_id, "players.id": player['id']},
            {"$set": {"players.$.isConnected": False, "players.$.lastSeen": datetime.utcnow()}}
        )
        
        sessions_collection.delete_many({"roomId": room_id, "playerId": player['id']})
        delete_player_sessions(room_id, player['id'])
        clear_socket_mapping(sid)

        leave_room(room_id, sid)

        updated_room = rooms_collection.find_one({"roomId": room_id})

        if not updated_room:
            logger.info(f"[LEAVE] Room {room_id} already removed")
            return

        emit('playerLeft', {
            "players": json_safe(updated_room.get("players", [])),
            "leftPlayerId": player['id']
        }, to=room_id)

    except Exception as e:
        logger.error(f"[ERROR] Error in leaveRoom: {str(e)}")


@socketio.on('discardRoom')
def handle_discard_room(data):
    """(Host only) Kills the room for everyone"""
    sid = request.sid
    try:
        room_id = data.get('roomId')
        player, room, error = get_player_and_room(
            sid,
            room_id,
            rooms_collection,
            get_socket_mapping,
            logger
        )
        
        if error:
            emit("error", {"error": error, "code": "AUTH_ERROR"}, to=sid)
            return
            
        if not player.get("isHost"):
            emit("error", {"error": "Only the host can discard the room", "code": "NOT_HOST"}, to=sid)
            return

        logger.info(f"[DISCARD] Host {player['id']} is discarding room {room_id}")

        emit('roomDiscarded', {"message": "The host has closed the room"}, to=room_id)
        socketio.close_room(room_id) # Disconnects all sockets
        
        rooms_collection.delete_one({"roomId": room_id})
        sessions_collection.delete_many({"roomId": room_id})
        cleanup_room_runtime(room_id)
        
        logger.info(f"[DISCARD] Room {room_id} completely cleaned up")

    except Exception as e:
        logger.error(f"[ERROR] Error in discardRoom: {str(e)}")
        emit("error", {"error": "Failed to discard room", "code": "DISCARD_ROOM_FAILED"}, to=sid)



def start_game_timer(room_id, duration=45):
    """Start a synchronized timer for a room"""
    end_time = datetime.utcnow() + timedelta(seconds=duration)
    set_timer(room_id, end_time.isoformat(), duration)

    def timer_worker(rid: str, end_time_local: datetime):
        try:
            remaining = (end_time_local - datetime.utcnow()).total_seconds()
            while remaining > 0:
                if redis_client and redis_client.hget(f"{TIMER_PREFIX}:{rid}", "cancel") == "1":
                    logger.info(f"[TIMER] Timer for {rid} cancelled by game event.")
                    redis_client.hset(f"{TIMER_PREFIX}:{rid}", "cancel", "0")
                    return
                    
                socketio.sleep(1)
                remaining = (end_time_local - datetime.utcnow()).total_seconds()

            logger.info(f"[TIMER] Timer for {rid} ended.")
            room = rooms_collection.find_one({"roomId": rid})
            if not room:
                return
            
            current_phase = room.get('gamePhase')
            
            if current_phase == 'memeSelection':
                logger.info(f"[TIMER] Forcing {rid} from 'memeSelection' to 'memeReveal'")
                broadcast_state(rid, {}, "memeReveal")

        except Exception as e:
            logger.error(f"[TIMER] Error in timer worker for {rid}: {e}")

    socketio.start_background_task(timer_worker, room_id, end_time)

    socketio.emit('timerStarted', {
        'duration': duration,
        'endTime': end_time.isoformat()
    }, to=room_id)

def stop_game_timer(room_id):
    """Stops the timer for a room (e.g., all players submitted)"""
    logger.info(f"[TIMER] Stopping timer for {room_id}")
    cancel_timer(room_id) # From your Redis helpers

def get_remaining_time(room_id):
    """Get remaining time for a room's timer"""
    try:
        if redis_client:
            end_iso = redis_client.hget(f"{TIMER_PREFIX}:{room_id}", "end_time")
            if end_iso:
                end_dt = datetime.fromisoformat(end_iso)
                remaining = (end_dt - datetime.utcnow()).total_seconds()
                return max(0, int(remaining))
    except Exception as e:
        logger.error(f"get_remaining_time error: {e}")
    return 0

# Periodic cleanup of old rooms and sessions
def cleanup_old_data():
    """Clean up old data periodically"""
    try:
        # Clean up old rooms (older than 24 hours) ONLY if not in active phases
        cutoff_time = datetime.utcnow() - timedelta(hours=24)
        rooms_collection.delete_many({
            "lastActivity": {"$lt": cutoff_time},
            "gamePhase": {"$in": ["lobby", "results"]}
        })
        
        # Clean up old sessions by lastSeen
        sessions_collection.delete_many({"lastSeen": {"$lt": cutoff_time}})
        
        # Clean up old OTP records
        otp_collection.delete_many({"created_at": {"$lt": cutoff_time}})
        
        print("[CLEANUP] Old data cleaned up successfully")
    except Exception as e:
        print(f"[CLEANUP] Error during cleanup: {str(e)}")
        
def periodic_cleanup_worker():
    while True:
        socketio.sleep(3600)  # 1 hour
        cleanup_old_data()
        try:
            if redis_client:
                pass
        except Exception as e:
            logger.error(f"timer cleanup scan error: {e}")

socketio.start_background_task(periodic_cleanup_worker)

# -------------------- MAIN --------------------

if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)
