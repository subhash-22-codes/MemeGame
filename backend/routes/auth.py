"""
Authentication routes: registration, login, OTP, password reset, guest access.
"""

import re
import jwt
import random
import logging
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash

from core.database import (
    JWT_SECRET_KEY, users_collection, otp_collection,
    redis_client, rate_limit_ip
)
from middleware.auth import create_guest_token
from utils.auth_utils import validate_email_format
from services.email_service import (
    send_registration_otp_email, send_professional_otp_email,
    send_email
)

logger = logging.getLogger(__name__)

auth_bp = Blueprint("auth", __name__)

# --- Constants ---
MAX_OTP_ATTEMPTS = 5
OTP_LOCKOUT_MINUTES = 15


@auth_bp.route("/api/guest", methods=["POST"])
def guest_login():
    """Create a guest session with a display name. No account required."""
    try:
        data = request.get_json() or {}
        display_name = str(data.get("displayName", "")).strip()

        if not display_name:
            return jsonify({"success": False, "error": "Display name is required"}), 400
        if len(display_name) < 2 or len(display_name) > 20:
            return jsonify({"success": False, "error": "Display name must be 2-20 characters"}), 400
        if not re.match(r'^[a-zA-Z0-9 _-]+$', display_name):
            return jsonify({"success": False, "error": "Display name can only contain letters, numbers, spaces, hyphens, and underscores"}), 400

        token, user_data = create_guest_token(display_name)

        return jsonify({
            "token": token,
            "user": user_data
        }), 200

    except Exception as e:
        logger.error(f"[AUTH] guest_login error: {e}")
        return jsonify({"success": False, "error": "Server error"}), 500


@auth_bp.route("/api/register", methods=["POST"])
def register():
    """Initiate registration by sending an OTP to the user's email."""
    try:
        data = request.get_json() or {}
        username = str(data.get("username", "")).strip()
        email = str(data.get("email", "")).strip().lower()
        password = str(data.get("password", "")).strip()

        if not username or not email or not password:
            return jsonify({"error": "All fields are required"}), 400
        if users_collection.find_one({"email": email}):
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
                "client_ip": request.remote_addr,
                "is_used": False,
                "purpose": "register"
            }},
            upsert=True
        )

        email_success, msg = send_registration_otp_email(email, otp, username)
        if not email_success:
            logger.error(f"[REGISTER] Failed to send OTP: {msg}")
            return jsonify({"error": "Failed to send OTP"}), 500

        logger.info(f"[REGISTER] OTP sent to {email}")
        return jsonify({"message": "OTP sent to email for registration"}), 200

    except Exception as e:
        logger.error(f"[AUTH] register error: {e}")
        return jsonify({"error": "Server error"}), 500


@auth_bp.route("/api/send-otp", methods=["POST"])
def send_otp():
    """Send a one-time password for login or password reset."""
    try:
        client_ip = request.environ.get('HTTP_X_FORWARDED_FOR', request.remote_addr)
        data = request.get_json() or {}
        email = str(data.get("email", "")).strip().lower()
        purpose = str(data.get("purpose", "login")).strip().lower()

        if not email:
            return jsonify({"error": "Email is required"}), 400
        if not validate_email_format(email):
            return jsonify({"error": "Invalid email format"}), 400
        if purpose not in {"register", "login", "reset"}:
            purpose = "login"

        # Cooldown: 1 OTP per minute per email
        recent = otp_collection.find_one({
            "email": email,
            "created_at": {"$gte": datetime.utcnow() - timedelta(minutes=1)}
        })
        if recent:
            return jsonify({"error": "Please wait before requesting another OTP"}), 429

        user = users_collection.find_one({"email": email})
        if purpose == "reset" and not user:
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


@auth_bp.route("/api/verify-otp", methods=["POST"])
def verify_otp():
    """Verify OTP for registration, login, or password reset."""
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

        # Brute-force protection: lockout after MAX_OTP_ATTEMPTS
        attempts = rec.get("attempts", 0)
        if attempts >= MAX_OTP_ATTEMPTS:
            lockout_until = rec.get("created_at", datetime.utcnow()) + timedelta(minutes=OTP_LOCKOUT_MINUTES)
            if datetime.utcnow() < lockout_until:
                remaining = int((lockout_until - datetime.utcnow()).total_seconds() / 60) + 1
                return jsonify({"error": f"Too many failed attempts. Try again in {remaining} minutes."}), 429
            else:
                # Lockout period expired, reset attempts
                otp_collection.update_one({"email": email}, {"$set": {"attempts": 0}})

        if rec.get("otp") != otp:
            otp_collection.update_one({"email": email}, {"$inc": {"attempts": 1}})
            remaining_attempts = MAX_OTP_ATTEMPTS - (attempts + 1)
            if remaining_attempts <= 0:
                return jsonify({"error": f"Too many failed attempts. Locked for {OTP_LOCKOUT_MINUTES} minutes."}), 429
            return jsonify({"error": f"Invalid OTP. {remaining_attempts} attempts remaining."}), 400

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
            "exp": datetime.utcnow() + timedelta(days=30)
        }, JWT_SECRET_KEY, algorithm="HS256")

        payload_user = {
            "id": user_id,
            "username": user.get("username"),
            "email": user.get("email"),
            "avatar": user.get("avatar")
        }

        if purpose == "register":
            try:
                formatted_time = datetime.now().strftime("%b %d, %Y %I:%M %p")
                subject = f"Welcome to MemeGame 🎉  |  {formatted_time}"
                body = f"Welcome {user.get('username', 'player')} to MemeGame!"
                send_email(email, subject, body)
            except Exception as e:
                logger.error(f"Welcome email failed for {email}: {e}")

        return jsonify({"token": token, "user": payload_user}), 200

    except Exception as e:
        logger.error(f"[AUTH] verify_otp error: {e}")
        return jsonify({"error": "Server error"}), 500


@auth_bp.route("/api/login", methods=["POST"])
def login():
    """Authenticate with email and password."""
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
            "exp": datetime.utcnow() + timedelta(days=30)
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
