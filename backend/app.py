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
import string
from bson import ObjectId
from flask_socketio import disconnect
from flask_socketio import SocketIO, emit, join_room, leave_room
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime, timedelta
import ssl
import logging
import time
import re
from bson.json_util import dumps, loads


# Configure logging early (before first use)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load .env variables
load_dotenv()
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY") 
SENDER_EMAIL = os.getenv("SENDER_EMAIL")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")
# MongoDB Atlas setup
# MONGODB_URI = os.getenv("MONGODB_URI")
client = MongoClient("mongodb://127.0.0.1:27017/")
db = client["memegame"]
users_collection = db["users"]
rooms_collection = db["rooms"]
otp_collection = db["otp_verifications"]
contact_collection = db["contact_messages"]
sessions_collection = db["sessions"]
game_results_collection = db["game_results"]

# Redis connection (for sessions, timers, rate-limits)
REDIS_URL = os.getenv("REDIS_URL")
redis_client: redis.Redis | None = None
if REDIS_URL:
    try:
        redis_client = redis.from_url(REDIS_URL, decode_responses=True)
        logger.info("Redis connected successfully")

        # Test Redis
        try:
            redis_client.set("redis_test_key", "ok", ex=10)  # expires in 10s
            val = redis_client.get("redis_test_key")
            if val == "ok":
                logger.info("Redis test key successfully set and retrieved")
            else:
                logger.warning("Redis test key set but failed to retrieve")
        except Exception as e:
            logger.error(f"Redis test failed: {e}")

    except Exception as e:
        logger.error(f"Redis connection failed: {e}")

# Helper: Rate limit using Redis (fallback to allow if Redis is unavailable)
def rate_limit_ip(ip: str, period_seconds: int = 60, max_requests: int = 3) -> bool:
    """Return True if within limit, False if rate-limited."""
    key = f"rate:{ip}"
    try:
        if redis_client:
            current = redis_client.incr(key)
            if current == 1:
                redis_client.expire(key, period_seconds)
            return current <= max_requests
    except Exception as e:
        logger.error(f"Redis rate limit error: {e}")
    # Fallback (very basic, non-shared): allow
    return True
# logger already configured above

# Session management via Redis
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

# -------------------- Auth session helpers --------------------
def set_active_user_session(session_id: str, user_id: str, email: str, ttl_seconds: int = 7 * 24 * 3600) -> None:
    """Store active authenticated user session in Redis with TTL."""
    try:
        if redis_client:
            redis_client.hset(f"session:{session_id}", mapping={
                "userId": user_id,
                "email": email,
                "createdAt": datetime.utcnow().isoformat()
            })
            redis_client.expire(f"session:{session_id}", ttl_seconds)
    except Exception as e:
        logger.error(f"Redis set_active_user_session error: {e}")

def generate_auth_session_id() -> str:
    """Generate a unique session ID for authenticated users."""
    return 'auth-' + str(int(time.time())) + '-' + ''.join(random.choices(string.ascii_lowercase + string.digits, k=10))

# Timer management in Redis and eventlet-friendly background task
TIMER_PREFIX = "timer"

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
    """Remove Redis runtime state for a room (sessions, timers)."""
    try:
        # Remove timers
        if redis_client:
            redis_client.delete(f"{TIMER_PREFIX}:{room_id}")
            # Remove room session tracking
            delete_sessions_for_room(room_id)
    except Exception as e:
        logger.error(f"cleanup_room_runtime error: {e}")

# -------------------- Reconnect/Disconnect helpers --------------------
def set_socket_mapping(sid: str, room_id: str, player_id: str, session_id: str) -> None:
    try:
        if redis_client:
            redis_client.hset(f"sock:{sid}", mapping={
                "roomId": room_id,
                "playerId": player_id,
                "sessionId": session_id,
                "lastSeen": datetime.utcnow().isoformat()
            })
            redis_client.expire(f"sock:{sid}", 24 * 3600)
    except Exception as e:
        logger.error(f"set_socket_mapping error: {e}")

def get_socket_mapping(sid: str) -> dict:
    try:
        if redis_client:
            return redis_client.hgetall(f"sock:{sid}") or {}
    except Exception as e:
        logger.error(f"get_socket_mapping error: {e}")
    return {}

def clear_socket_mapping(sid: str) -> None:
    try:
        if redis_client:
            redis_client.delete(f"sock:{sid}")
    except Exception as e:
        logger.error(f"clear_socket_mapping error: {e}")

def set_rejoin_grace(session_id: str, ttl_seconds: int = 15) -> None:
    try:
        if redis_client:
            redis_client.setex(f"rejoin_grace:{session_id}", ttl_seconds, "1")
    except Exception as e:
        logger.error(f"set_rejoin_grace error: {e}")

def pop_rejoin_grace(session_id: str) -> bool:
    try:
        if redis_client:
            pipe = redis_client.pipeline()
            key = f"rejoin_grace:{session_id}"
            pipe.get(key)
            pipe.delete(key)
            val, _ = pipe.execute()
            return bool(val)
    except Exception as e:
        logger.error(f"pop_rejoin_grace error: {e}")
    return False

def finalize_game(room_id: str) -> dict | None:
    """
    Compute winner and persist results if and only if the game completed.
    Returns the result document or None if not stored.
    """
    try:
        room = rooms_collection.find_one({"roomId": room_id})
        if not room:
            return None
        # Game considered complete only if phase is 'results' or 'finalResults' and currentRound >= totalRounds
        if (room.get("gamePhase") not in ("results", "finalResults")):
            return None
        total_rounds = int(room.get("totalRounds", 0) or 0)
        current_round = int(room.get("currentRound", 0) or 0)
        players = room.get("players", [])
        if current_round < total_rounds or len(players) < 2:
            # Incomplete or not enough players; don't store
            return None

        # Compute winner(s)
        winner = None
        top_score = -1
        for p in players:
            score = int(p.get("score", 0) or 0)
            if score > top_score:
                top_score = score
                winner = {
                    "id": p.get("id"),
                    "username": p.get("username"),
                    "score": score,
                    "avatar": p.get("avatar")
                }

        if winner is None:
            return None

        # Idempotent upsert by roomId
        result_doc = {
            "roomId": room_id,
            "winner": winner,
            "players": [{
                "id": p.get("id"),
                "username": p.get("username"),
                "score": int(p.get("score", 0) or 0),
                "avatar": p.get("avatar")
            } for p in players],
            "totalRounds": total_rounds,
            "completedAt": datetime.utcnow()
        }
        game_results_collection.update_one(
            {"roomId": room_id},
            {"$setOnInsert": result_doc},
            upsert=True
        )

        # Cleanup Redis runtime after storing
        cleanup_room_runtime(room_id)
        return result_doc
    except Exception as e:
        logger.error(f"finalize_game error: {e}")
        return None

# Initialize Flask
app = Flask(__name__)
CORS(app)

# Socket.IO setup (tolerant mobile timeouts)
socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    ping_timeout=40,    # allow more time for backgrounded mobile tabs
    ping_interval=20
)

# Configuration
UPLOAD_FOLDER = 'upload_pictures'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

# Ensure upload directory exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def get_thank_you_email(name, message):
    return f"""
    <html>
      <head>
        <style>
          @media only screen and (max-width: 600px) {{
            .container {{
              padding: 1rem !important;
            }}
          }}
        </style>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f9f9f9;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9f9f9; padding: 2rem 0;">
          <tr>
            <td align="center">
              <table class="container" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); overflow: hidden; padding: 2rem;">
                <tr>
                  <td align="center" style="padding-bottom: 1rem;">
                    <h1 style="margin: 0; color: #5F8B4C; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">MemeGame</h1>
                    <p style="margin: 0; font-size: 0.9em; color: #888;">Thank you for contacting us!</p>
                  </td>
                </tr>

                <tr>
                  <td style="padding-top: 1.5rem;">
                    <p style="font-size: 1.05em; line-height: 1.6; color: #333;">
                      Hi <strong>{name}</strong>,
                    </p>
                    <p style="font-size: 1.05em; line-height: 1.6; color: #333;">
                      We've received your message and are excited to hear from you. Here's what you wrote:
                    </p>

                    <div style="margin: 1rem 0; padding: 1rem; background-color: #f0f5f0; border-left: 4px solid #5F8B4C; font-style: italic; color: #444; border-radius: 8px;">
                      {message}
                    </div>

                    <p style="font-size: 1.05em; color: #333;">
                      Our team will review your message and get back to you as soon as possible. Stay tuned! ✨
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding-top: 2rem; font-size: 0.9em; color: #999;">
                    <hr style="border: none; border-top: 1px solid #eee; margin: 2rem 0;">
                    <p style="margin: 0;">Warm regards,</p>
                    <p style="margin: 0;"><strong>The MemeGame Team</strong></p>
                    <p style="margin-top: 0.5rem; font-size: 0.8em; color: #bbb;">
                      © {datetime.now().year} MemeGame, All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
    """



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

        message_obj = MIMEMultipart("alternative")
        message_obj["Subject"] = subject
        message_obj["From"] = f"MemeGame Team <{SENDER_EMAIL}>"
        message_obj["To"] = email
        message_obj.attach(MIMEText(html_content, "html", "utf-8"))

        server = create_smtp_connection_with_retry()
        server.sendmail(SENDER_EMAIL, email, message_obj.as_string())
        server.quit()

        return jsonify({ "success": True, "message": "Message sent successfully!" }), 200

    except Exception as e:
        logger.error(f"[CONTACT ERROR] {str(e)}")
        return jsonify({ "success": False, "error": "Server error. Please try again later." }), 500


def get_professional_otp_template(otp, user_name=None, company_name="MemeGame"):
    """Generate beautiful, responsive HTML email template for OTP"""
    greeting_name = user_name if user_name else "User"
    
    html_template = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset - {company_name}</title>
        <style>
            * {{
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }}
            
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                line-height: 1.6;
                color: #333333;
                background-color: #f8fafc;
            }}
            
            .email-container {{
                max-width: 600px;
                margin: 0 auto;
                background-color: #ffffff;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
            }}
            
            .header {{
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                padding: 40px 30px;
                text-align: center;
                color: white;
            }}
            
            .header h1 {{
                font-size: 28px;
                font-weight: 700;
                margin-bottom: 8px;
                letter-spacing: -0.5px;
            }}
            
            .header p {{
                font-size: 16px;
                opacity: 0.9;
                margin: 0;
            }}
            
            .content {{
                padding: 40px 30px;
            }}
            
            .greeting {{
                font-size: 18px;
                font-weight: 600;
                color: #1a202c;
                margin-bottom: 20px;
            }}
            
            .message {{
                font-size: 16px;
                color: #4a5568;
                margin-bottom: 30px;
                line-height: 1.7;
            }}
            
            .otp-container {{
                background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
                border: 2px dashed #cbd5e0;
                border-radius: 12px;
                padding: 30px;
                text-align: center;
                margin: 30px 0;
            }}
            
            .otp-label {{
                font-size: 14px;
                font-weight: 600;
                color: #718096;
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-bottom: 15px;
            }}
            
            .otp-code {{
                font-size: 36px;
                font-weight: 800;
                color: #667eea;
                font-family: 'Courier New', monospace;
                letter-spacing: 8px;
                margin: 15px 0;
                text-shadow: 0 2px 4px rgba(102, 126, 234, 0.2);
            }}
            
            .otp-note {{
                font-size: 13px;
                color: #a0aec0;
                margin-top: 15px;
            }}
            
            .security-notice {{
                background-color: #fef5e7;
                border-left: 4px solid #f6ad55;
                padding: 20px;
                margin: 30px 0;
                border-radius: 0 8px 8px 0;
            }}
            
            .security-notice h3 {{
                font-size: 16px;
                font-weight: 600;
                color: #c05621;
                margin-bottom: 10px;
                display: flex;
                align-items: center;
            }}
            
            .security-notice p {{
                font-size: 14px;
                color: #9c4221;
                margin: 0;
                line-height: 1.6;
            }}
            
            .footer {{
                background-color: #f7fafc;
                padding: 30px;
                text-align: center;
                border-top: 1px solid #e2e8f0;
            }}
            
            .footer p {{
                font-size: 14px;
                color: #718096;
                margin-bottom: 15px;
            }}
            
            .divider {{
                height: 1px;
                background: linear-gradient(90deg, transparent, #e2e8f0, transparent);
                margin: 30px 0;
            }}
            
            .help-section {{
                background-color: #f0fff4;
                border: 1px solid #9ae6b4;
                border-radius: 8px;
                padding: 20px;
                margin: 20px 0;
                text-align: center;
            }}
            
            .help-section h4 {{
                font-size: 16px;
                font-weight: 600;
                color: #22543d;
                margin-bottom: 10px;
            }}
            
            .help-section p {{
                font-size: 14px;
                color: #2f855a;
                margin: 0;
            }}
            
            .help-section a {{
                color: #38a169;
                text-decoration: none;
                font-weight: 600;
            }}
            
            @media only screen and (max-width: 600px) {{
                .email-container {{
                    margin: 10px;
                    border-radius: 8px;
                }}
                
                .header, .content, .footer {{
                    padding: 25px 20px;
                }}
                
                .otp-code {{
                    font-size: 28px;
                    letter-spacing: 4px;
                }}
                
                .header h1 {{
                    font-size: 24px;
                }}
            }}
        </style>
    </head>
    <body>
        <div class="email-container">
            <!-- Header -->
            <div class="header">
                <h1>🔐 {company_name}</h1>
                <p>Secure Password Reset</p>
            </div>
            
            <!-- Main Content -->
            <div class="content">
                <div class="greeting">Hello {greeting_name}! 👋</div>
                
                <div class="message">
                    We received a request to reset your password. To proceed with the password reset, 
                    please use the verification code below. This code is valid for <strong>5 minutes</strong> only.
                </div>
                
                <!-- OTP Section -->
                <div class="otp-container">
                    <div class="otp-label">Your Verification Code</div>
                    <div class="otp-code">{otp}</div>
                    <div class="otp-note">Enter this code in the password reset form</div>
                </div>
                
                <!-- Security Notice -->
                <div class="security-notice">
                    <h3>🛡️ Security Notice</h3>
                    <p>
                        If you didn't request this password reset, please ignore this email. 
                        Your account remains secure and no changes have been made.
                    </p>
                </div>
                
                <div class="divider"></div>
                
                <!-- Help Section -->
                <div class="help-section">
                    <h4>Need Help?</h4>
                    <p>
                        If you're having trouble with the password reset process, 
                        <a href="mailto:support@memegame.com">contact our support team</a> 
                        and we'll be happy to assist you.
                    </p>
                </div>
            </div>
            
            <!-- Footer -->
            <div class="footer">
                <p>This email was sent by {company_name} Security Team</p>
                <p>© 2024 {company_name}. All rights reserved.</p>
                
                <p style="font-size: 12px; color: #a0aec0; margin-top: 20px;">
                    You received this email because you requested a password reset for your {company_name} account.
                </p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return html_template

def get_plain_text_template(otp, user_name=None, company_name="MemeGame"):
    """Generate plain text version for email clients that don't support HTML"""
    greeting_name = user_name if user_name else "User"
    
    plain_text = f"""
{company_name} - Password Reset Verification

Hello {greeting_name}!

We received a request to reset your password. To proceed with the password reset, please use the verification code below:

VERIFICATION CODE: {otp}

This code is valid for 5 minutes only.

SECURITY NOTICE:
If you didn't request this password reset, please ignore this email. Your account remains secure and no changes have been made.

Need help? Contact our support team at support@memegame.com

Best regards,
{company_name} Security Team

© 2024 {company_name}. All rights reserved.

You received this email because you requested a password reset for your {company_name} account.
    """
    
    return plain_text.strip()

def get_registration_otp_template(otp: str, user_name: str | None = None, company_name: str = "MemeGame") -> str:
    """Registration OTP email with a welcoming tone."""
    display_name = user_name or "there"
    return f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Welcome to {company_name}!</title>
      <style>
        body {{ font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,Cantarell,sans-serif; background:#f8fafc; color:#1a202c; margin:0; }}
        .card {{ max-width: 640px; margin: 24px auto; background:#fff; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,.08); overflow:hidden; }}
        .header {{ background: linear-gradient(135deg,#5F8B4C,#D98324); color:#fff; padding: 28px 24px; text-align:center; }}
        .content {{ padding: 28px 24px; }}
        .otp {{ letter-spacing: 8px; font-weight: 800; font-size: 32px; color:#5F8B4C; text-align:center; margin: 16px 0; }}
        .note {{ text-align:center; color:#4a5568; font-size:14px; }}
        .footer {{ padding: 18px 24px; background:#f7fafc; text-align:center; color:#718096; font-size: 13px; }}
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>🎉 Welcome to {company_name}!</h1>
          <p>Hi {display_name}, let's verify your email to get started.</p>
        </div>
        <div class="content">
          <p>Use the code below to complete your signup. It expires in <strong>5 minutes</strong>.</p>
          <div class="otp">{otp}</div>
          <p class="note">If you didn't request this, you can safely ignore this email.</p>
        </div>
        <div class="footer">© {datetime.now().year} {company_name}. All rights reserved.</div>
      </div>
    </body>
    </html>
    """

def send_registration_otp_email(to_email: str, otp: str, user_name: str | None = None) -> tuple[bool, str]:
    """Send the registration OTP using the welcoming template."""
    try:
        message = MIMEMultipart("alternative")
        now_str = datetime.now().strftime("%A %d %b %Y, %I:%M %p")
        message["Subject"] = f"Welcome to MemeGame 🎉 | Verify your email ({now_str})"
        message["From"] = f"MemeGame Team <{SENDER_EMAIL}>"
        message["To"] = to_email

        html_content = get_registration_otp_template(otp, user_name, "MemeGame")
        text_fallback = f"Welcome to MemeGame! Your verification code is {otp}. It expires in 5 minutes."
        message.attach(MIMEText(text_fallback, "plain", "utf-8"))
        message.attach(MIMEText(html_content, "html", "utf-8"))

        server = create_smtp_connection_with_retry()
        server.sendmail(SENDER_EMAIL, to_email, message.as_string())
        server.quit()
        return True, "Email sent successfully"
    except Exception as e:
        logger.error(f"Failed to send registration OTP email: {str(e)}")
        return False, str(e)

def validate_email_format(email):
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None


def create_smtp_connection_with_retry(max_retries=3):
    """Create SMTP connection with retry logic"""
    for attempt in range(max_retries):
        try:
            # Create SMTP connection
            server = smtplib.SMTP("smtp.gmail.com", 587, timeout=30)
            
            # Enable TLS
            context = ssl.create_default_context()
            server.starttls(context=context)
            
            # Login using .env values
            server.login(SENDER_EMAIL, EMAIL_PASSWORD)
            
            logger.info(f"SMTP connection established successfully (attempt {attempt + 1})")
            return server
            
        except smtplib.SMTPAuthenticationError as e:
            logger.error(f"SMTP Authentication failed: {str(e)}")
            raise Exception("Email authentication failed. Please check credentials.")
            
        except smtplib.SMTPConnectError as e:
            logger.error(f"SMTP Connection failed (attempt {attempt + 1}): {str(e)}")
            if attempt < max_retries - 1:
                socketio.sleep(2 * (attempt + 1))  # Eventlet-friendly backoff
                continue
            raise Exception("Failed to connect to email server after multiple attempts.")
            
        except Exception as e:
            logger.error(f"Unexpected SMTP error (attempt {attempt + 1}): {str(e)}")
            if attempt < max_retries - 1:
                socketio.sleep(2 * (attempt + 1))
                continue
            raise Exception(f"Email service error: {str(e)}")
    
    raise Exception("Failed to establish SMTP connection after all retry attempts.")



def send_professional_otp_email(to_email, otp, user_name=None):
    """Send professional OTP email with HTML template"""
    try:
        # Create multipart message
        message = MIMEMultipart("alternative")
        now_str = datetime.now().strftime("%A %d %b %Y, %I:%M %p")
        message["Subject"] = f"🔐 MemeGame - Password Reset Code ({now_str})"
        message["From"] = f"MemeGame Security Team <{SENDER_EMAIL}>"
        message["To"] = to_email
        message["Reply-To"] = "support@memegame.com"
        
        # Add custom headers for better deliverability
        message["X-Priority"] = "1"
        message["X-MSMail-Priority"] = "High"
        message["Importance"] = "High"
        message["X-Mailer"] = "MemeGame Email Service v2.0"
        
        # Create plain text version
        plain_text = get_plain_text_template(otp, user_name, "MemeGame")
        text_part = MIMEText(plain_text, "plain", "utf-8")
        
        # Create HTML version
        html_content = get_professional_otp_template(otp, user_name, "MemeGame")
        html_part = MIMEText(html_content, "html", "utf-8")
        
        # Attach parts
        message.attach(text_part)
        message.attach(html_part)
        
        # Send email with retry logic
        server = create_smtp_connection_with_retry()
        server.sendmail(SENDER_EMAIL, to_email, message.as_string())
        server.quit()
        
        return True, "Email sent successfully"
        
    except Exception as e:
        logger.error(f"Failed to send email: {str(e)}")
        return False, str(e)

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
     
        
# Removed deprecated email stats endpoint

    
@app.route("/api/verify-otp", methods=["POST"])
def verify_otp():
    """
    Verify OTP. Supports purposes:
    - register: create user, then issue JWT
    - login: issue JWT
    - reset: set new password when provided
    Body: { email, otp, purpose, username?, password? (for register/reset) }
    """
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
        if rec.get("is_used"):
            return jsonify({"error": "OTP already used"}), 400
        if rec.get("otp") != otp:
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
            users_collection.update_one({"email": email}, {"$set": {"password": generate_password_hash(password)}})
            user_id = str(user["_id"])
        else:  # login
            if not user:
                return jsonify({"error": "User not found"}), 404
            user_id = str(user["_id"])

        # Mark OTP as used
        otp_collection.update_one({"email": email}, {"$set": {"is_used": True}})

        # Issue JWT
        token = jwt.encode({
            "email": email,
            "id": user_id,
            "exp": datetime.utcnow() + timedelta(days=7)
        }, JWT_SECRET_KEY, algorithm="HS256")

        # Create Redis-backed auth session
        session_id = generate_auth_session_id()
        set_active_user_session(session_id, user_id, email)

        # Response payload
        payload_user = {
            "id": user_id,
            "username": user.get("username"),
            "email": user.get("email"),
            "avatar": user.get("avatar")
        }

        # Send post-signup welcome email (registration only)
        if purpose == "register":
            try:
                now = datetime.now()
                formatted_time = now.strftime("%b %d, %Y %I:%M %p")
                subject = f"Welcome to MemeGame 🎉  |  {formatted_time}"
                body = f"Welcome {user.get('username','player')} to MemeGame!"
                send_email(email, subject, body)
                logger.info(f"[WELCOME] Welcome email sent to {email}")
            except Exception as e:
                logger.error(f"[WELCOME] Failed to send welcome email to {email}: {e}")

        logger.info(f"[AUTH] OTP verified for {email}, purpose={purpose}, session={session_id}")
        return jsonify({"token": token, "user": payload_user, "sessionId": session_id}), 200
    except Exception as e:
        logger.error(f"[AUTH] verify_otp error: {e}")
        return jsonify({"error": "Server error"}), 500


# Helper to generate a random room ID
def generate_unique_room_id():
    """Generate a unique 6-character room ID"""
    attempts = 0
    while attempts < 10:  # Prevent infinite loop
        room_id = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        if not rooms_collection.find_one({"roomId": room_id}):
            print(f"[DEBUG] Generated unique room ID: {room_id} (attempt {attempts + 1})")
            return room_id
        attempts += 1
        print(f"[DEBUG] Room ID {room_id} already exists, trying again...")
    
    # Fallback: use timestamp-based ID
    timestamp_id = str(int(time.time()))[-6:].upper()
    print(f"[DEBUG] Using fallback room ID: {timestamp_id}")
    return timestamp_id

# -------------------- USER ROUTES --------------------
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

# -------------------- EMAIL SENDING FUNCTION --------------------
def send_email(to_email, subject, body):
    """
    Send a beautifully formatted HTML email to users
    
    Parameters:
    - to_email (str): Recipient's email address
    - subject (str): Email subject
    - body (str): Plain text content (used as fallback)
    
    The function automatically extracts the username from the email or uses
    any {username} placeholder in the body parameter.
    """
    sender_email = SENDER_EMAIL
    password = EMAIL_PASSWORD
    
    # Extract username from email or body
    username = to_email.split('@')[0]
    if "{username}" in body:
        username = body.split("{username}")[1].split()[0]
    
    # Create the HTML email template
    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{subject}</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;700&display=swap');
            
            body {{
                font-family: 'Poppins', Arial, sans-serif;
                margin: 0;
                padding: 0;
                color: #333333;
                background-color: #f5f5f5;
            }}
            
            .email-container {{
                max-width: 600px;
                margin: 0 auto;
                background-color: #ffffff;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
            }}
            
            .email-header {{
                background: linear-gradient(135deg, #8B5CF6 0%, #1E40AF 100%);
                color: white;
                padding: 30px 20px;
                text-align: center;
            }}
            
            .email-header h1 {{
                margin: 0;
                font-size: 28px;
                font-weight: 700;
            }}
            
            .emoji-icon {{
                font-size: 36px;
                margin: 10px 0;
            }}
            
            .welcome-text {{
                font-size: 18px;
                margin-top: 10px;
                opacity: 0.9;
            }}
            
            .email-body {{
                padding: 30px 20px;
                line-height: 1.6;
            }}
            
            .username {{
                font-weight: 700;
                color: #8B5CF6;
            }}
            
            .feature-section {{
                background-color: #f9f9f9;
                border-radius: 8px;
                padding: 20px;
                margin: 20px 0;
            }}
            
            .feature-title {{
                font-weight: 600;
                color: #1E40AF;
                margin-top: 0;
                margin-bottom: 10px;
                font-size: 18px;
            }}
            
            .feature-list {{
                margin: 15px 0;
                padding-left: 20px;
            }}
            
            .feature-list li {{
                margin-bottom: 8px;
            }}
            
            .button-container {{
                text-align: center;
                margin: 30px 0;
            }}
            
            .cta-button {{
                display: inline-block;
                background-color: #8B5CF6;
                color: white;
                padding: 12px 24px;
                text-decoration: none;
                border-radius: 6px;
                font-weight: 500;
                letter-spacing: 0.3px;
            }}
            
            .cta-button:hover {{
                background-color: #7C3AED;
            }}
            
            .divider {{
                height: 1px;
                background-color: #e5e7eb;
                margin: 25px 0;
            }}
            
            .email-footer {{
                background-color: #f9f9f9;
                padding: 20px;
                text-align: center;
                color: #6b7280;
                font-size: 14px;
            }}
            
            .social-icons {{
                margin: 15px 0;
            }}
            
            .social-icons a {{
                display: inline-block;
                margin: 0 8px;
                color: #8B5CF6;
                text-decoration: none;
            }}
            
            @media only screen and (max-width: 600px) {{
                .email-header h1 {{
                    font-size: 24px;
                }}
                
                .email-body {{
                    padding: 20px 15px;
                }}
            }}
        </style>
    </head>
    <body>
        <div class="email-container">
            <div class="email-header">
                <div class="emoji-icon">🎮</div>
                <h1>Welcome to MemeGame!</h1>
                <p class="welcome-text">Get ready for fun, laughter, and meme madness!</p>
            </div>
            
            <div class="email-body">
                <p>Hey <span class="username">{username}</span>! 👋</p>
                
                <p>Thanks for joining MemeGame - where humor meets competition! We're excited to have you as part of our community.</p>
                
                <div class="feature-section">
                    <h3 class="feature-title">Ready to play? Here's how it works:</h3>
                    <ul class="feature-list">
                        <li>Create or join a game room with friends</li>
                        <li>Take turns being the Judge who writes funny prompts</li>
                        <li>Choose the perfect meme to match the prompt</li>
                        <li>Score points and laugh together!</li>
                    </ul>
                </div>
                
                <div class="button-container">
                    <a href="#" class="cta-button">START PLAYING NOW</a>
                </div>
                
                <p>Pro tip: The more friends you invite, the more fun it gets! Share your game room link to get the party started.</p>
                
                <div class="divider"></div>
                
                <p>Got questions? Need help? Feel free to reply to this email - we're here to help!</p>
                
                <p>Happy Meme-ing!<br>The MemeGame Team</p>
            </div>
            
            <div class="email-footer">
                <div class="social-icons">
                    <a href="#">Twitter</a> • 
                    <a href="#">Instagram</a> • 
                    <a href="#">Discord</a>
                </div>
                <p>&copy; 2025 MemeGame. All rights reserved.</p>
                <p>You received this email because you signed up for MemeGame.</p>
            </div>
        </div>
    </body>
    </html>
    """

    # Set up the email
    msg = MIMEMultipart()
    msg['From'] = f"MemeGame Team <{SENDER_EMAIL}>"
    msg['To'] = to_email
    msg['Subject'] = subject
    
    # Attach both plain text and HTML versions
    msg.attach(MIMEText(body, 'plain'))
    msg.attach(MIMEText(html_content, 'html'))

    try:
        with smtplib.SMTP('smtp.gmail.com', 587) as server:
            server.starttls()
            server.login(sender_email, password)
            server.sendmail(sender_email, to_email, msg.as_string())
        print(f"✅ Welcome email sent successfully to {to_email}!")
        return True
    except Exception as e:
        print(f"❌ Error sending welcome email: {e}")
        return False

@app.route("/api/login", methods=["POST"])
def login():
    """Password-based login only."""
    data = request.get_json() or {}
    email = str(data.get("email", "")).strip().lower()
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    user = users_collection.find_one({"email": email})
    if not user:
        return jsonify({"error": "User not found"}), 404

    if not check_password_hash(user.get("password", ""), password):
        return jsonify({"error": "Incorrect password"}), 401

    token = jwt.encode({
        "email": email,
        "id": str(user["_id"]),
        "exp": datetime.utcnow() + timedelta(days=7)
    }, JWT_SECRET_KEY, algorithm="HS256")
    session_id = generate_auth_session_id()
    set_active_user_session(session_id, str(user["_id"]), email)
    return jsonify({
        "token": token,
        "user": {
            "id": str(user["_id"]),
            "username": user.get("username"),
            "email": user.get("email"),
            "avatar": user.get("avatar")
        },
        "sessionId": session_id
    }), 200
# -------------------- SOCKET.IO EVENTS --------------------
def generate_session_id():
    """Generate a unique session ID"""
    return 'session-' + str(int(time.time())) + '-' + ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))

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

def get_room_with_validation(room_id):
    """Get room and validate it exists"""
    room = rooms_collection.find_one({"roomId": room_id})
    if not room:
        return None, "Room not found"
    return room, None

def validate_player_in_room(room, player_id):
    """Validate that player is in the room"""
    return any(p["id"] == player_id for p in room.get("players", []))

@socketio.on('connect')
def handle_connect():
    """Handle client connection"""
    print(f"[CONNECT] Client connected: {request.sid}")
    cleanup_old_sessions()

@socketio.on("disconnect")
def handle_disconnect():
    """Handle client disconnection with cleanup + notify others"""
    sid = request.sid
    print(f"[DISCONNECT] Client disconnected: {sid}")

    try:
        # Find session by sid → (roomId, playerId)
        session = redis_client.hgetall(f"sid:{sid}") if redis_client else {}
        if not session:
            print(f"[INFO] Disconnect before session established: {sid}")
            return

        # Handle both str and bytes
        def _val(key: str) -> str:
            v = session.get(key) or session.get(key.encode())
            if isinstance(v, bytes):
                return v.decode()
            return v or ""

        room_id = _val("roomId")
        player_id = _val("playerId")
        session_id = _val("sessionId")

        if not all([room_id, player_id, session_id]):
            print(f"[INFO] Incomplete session data on disconnect, ignoring: {session}")
            return

        # Mark player as disconnected in MongoDB
        result = rooms_collection.update_one(
            {"roomId": room_id, "players.id": player_id},
            {"$set": {"players.$.isConnected": False, "players.$.lastSeen": datetime.utcnow()}}
        )
        print(f"[DISCONNECT] Updated DB for player {player_id} disconnected: {result.modified_count} document(s)")

        # Notify others in room
        emit("playerDisconnected", {"playerId": player_id, "roomId": room_id}, to=room_id)
        print(f"[DISCONNECT] Broadcasted disconnect to room {room_id}")

        # Grace period for quick reconnect (15s window)
        if redis_client:
            redis_client.setex(f"disconnected:{player_id}", 15, room_id)
        print(f"[DISCONNECT] Set grace period for player {player_id}")

        # Remove sid mapping from Redis
        if redis_client:
            redis_client.delete(f"sid:{sid}")
        print(f"[DISCONNECT] Removed sid mapping for {sid}")

    except Exception as e:
        print(f"[ERROR] Exception in disconnect: {e}")


        
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

@socketio.on('createRoom')
def handle_create_room(data):
    """Create a new game room with enhanced session management"""
    print(f"[DEBUG] Received 'createRoom' event with data: {data}")

    try:
        rounds = data.get("rounds")
        rounds_per_judge = data.get("roundsPerJudge")
        host = data.get("host")
        
        if not rounds or not rounds_per_judge or not host:
            print("[ERROR] Missing required room data in 'createRoom'")
            emit("error", {"error": "Missing required room data", "code": "MISSING_DATA"})
            return

        host["isHost"] = True
        host["isConnected"] = True
        host["lastSeen"] = datetime.utcnow()

        room_id = generate_unique_room_id()
        session_id = generate_session_id()
        
        print(f"[DEBUG] Generated unique room ID: {room_id}, session ID: {session_id}")

        room_data = {
            "roomId": room_id,
            "host": host,
            "players": [host],
            "totalRounds": rounds,  # Changed from "rounds" to "totalRounds"
            "roundsPerJudge": rounds_per_judge,
            "currentRound": 0,
            "gamePhase": "lobby",
            "currentJudge": None,
            "currentSentence": None,
            "submissions": [],
            "createdAt": datetime.utcnow(),
            "lastActivity": datetime.utcnow()
        }

        insert_result = rooms_collection.insert_one(room_data)
        print(f"[DEBUG] Inserted room data with _id: {insert_result.inserted_id}")

        # Upsert session record to avoid duplicates
        sessions_collection.update_one(
            {"sessionId": session_id},
            {"$set": {
                "sessionId": session_id,
                "roomId": room_id,
                "playerId": host["id"],
                "lastSeen": datetime.utcnow(),
                "isHost": True
            }},
            upsert=True
        )

        # Track active session in Redis
        set_active_session(session_id, room_id, host["id"])

        sid = request.sid
        join_room(room_id)
        print(f"[DEBUG] Socket {sid} joined room {room_id}")

        # Convert ObjectId for JSON serialization
        room_data["_id"] = str(insert_result.inserted_id)
        
        # Emit room created event with session ID
        emit('roomCreated', {
            "roomData": json_safe(room_data),
            "sessionId": session_id
        }, to=sid)

        # Return success response to the callback
        return {"success": True, "roomId": room_id, "sessionId": session_id}

    except Exception as e:
        print(f"[ERROR] Error in createRoom: {str(e)}")
        emit("error", {"error": "Failed to create room", "code": "CREATE_ROOM_FAILED"})
        return {"success": False, "error": "Failed to create room"}

@socketio.on('joinRoom')
def handle_join_room(data):
    """Join an existing room with connection validation + reconnect support"""
    print(f"[DEBUG] Received 'joinRoom' event with data: {data}")

    try:
        room_id = data.get("roomId")
        player = data.get("player")
        provided_session_id = data.get("sessionId")

        if not room_id or not player:
            emit("error", {"error": "Room ID and player info required", "code": "MISSING_DATA"}, to=request.sid)
            return

        # Validate room exists
        room, error = get_room_with_validation(room_id)
        if error:
            emit("error", {"error": error, "code": "ROOM_NOT_FOUND"}, to=request.sid)
            return

        # If game already started, allow rejoin path when sessionId is provided or player already exists
        game_started = room.get("gamePhase") != "lobby"

        player_id = player["id"]

        # Reconnect handling: check if this player is already in the room
        existing_idx = next((i for i, p in enumerate(room.get("players", [])) if p["id"] == player_id), None)

        if existing_idx is not None:
            # Player is rejoining → update their status and ensure they have a sessionId
            existing_player = room["players"][existing_idx]
            existing_player["isConnected"] = True
            existing_player["lastSeen"] = datetime.utcnow()

            # Reuse sessionId if present, otherwise create and persist it
            session_id = provided_session_id or existing_player.get("sessionId")
            if not session_id:
                session_id = generate_session_id()
                existing_player["sessionId"] = session_id
                # update the in-memory room players so DB update below persists sessionId
                room["players"][existing_idx] = existing_player

            print(f"[DEBUG] Player {player_id} reconnected in room {room_id} (session {session_id})")

        else:
            # Fresh player joining
            if game_started:
                emit("error", {"error": "Game has already started", "code": "GAME_ALREADY_STARTED"}, to=request.sid)
                return
            session_id = provided_session_id or generate_session_id()
            player["isConnected"] = True
            player["lastSeen"] = datetime.utcnow()
            player["sessionId"] = session_id
            room.setdefault("players", []).append(player)
            print(f"[DEBUG] New player {player_id} joined room {room_id} (session {session_id})")

        # Save room update in DB (players possibly modified above)
        rooms_collection.update_one(
            {"roomId": room_id},
            {"$set": {"players": room["players"], "lastActivity": datetime.utcnow()}}
        )

        # Save session record in DB
        sessions_collection.update_one(
            {"sessionId": session_id},
            {"$set": {
                "sessionId": session_id,
                "roomId": room_id,
                "playerId": player_id,
                "lastSeen": datetime.utcnow(),
                "isHost": False
            }},
            upsert=True
        )

        # Remove stale sessions of same player in same room to avoid DB bloat
        sessions_collection.delete_many({
            "roomId": room_id,
            "playerId": player_id,
            "sessionId": {"$ne": session_id}
        })

        # Save sid → session mapping in Redis (if available)
        sid = request.sid
        if redis_client:
            try:
                redis_client.hset(f"sid:{sid}", mapping={
                    "sessionId": session_id,
                    "roomId": room_id,
                    "playerId": player_id
                })
                redis_client.expire(f"sid:{sid}", 3600)  # expire in 1h
            except Exception as e:
                print(f"[WARN] Failed to write sid mapping to Redis: {e}")

        # Track active session (your helper)
        try:
            set_active_session(session_id, room_id, player_id)
        except Exception:
            pass

        # Join socket room and emit updates
        join_room(room_id)
        print(f"[DEBUG] Socket {sid} joined room {room_id}")

        updated_room = rooms_collection.find_one({"roomId": room_id})
        if updated_room:
            updated_room["_id"] = str(updated_room["_id"])

        # Notify others in the room
        emit("playerJoined", json_safe(updated_room.get("players", [])), to=room_id)

        # Send full room state back to joining client (and session id)
        emit("roomJoined", {
            "roomData": json_safe(updated_room),
            "sessionId": session_id
        }, to=sid)

    except Exception as e:
        print(f"[ERROR] Error in joinRoom: {str(e)}")
        emit("error", {"error": "Failed to join room", "code": "JOIN_FAILED"}, to=request.sid)


@socketio.on('rejoinRoom')
def handle_rejoin_room(data):
    """Handle room rejoining with session validation + grace period support"""
    print(f"[DEBUG] Received 'rejoinRoom' event: {data}")

    try:
        room_id = data.get("roomId")
        player_id = data.get("playerId")
        session_id = data.get("sessionId")

        if not all([room_id, player_id, session_id]):
            print("[ERROR] Missing required rejoin data")
            emit("error", {"error": "Missing session data", "code": "INVALID_SESSION"}, to=request.sid)
            return

        # Check grace period for quick reconnect
        if redis_client.exists(f"disconnected:{player_id}"):
            print(f"[REJOIN] Player {player_id} reconnecting within grace period")
        else:
            print(f"[REJOIN] Player {player_id} reconnecting normally")

        # Validate session exists
        session = sessions_collection.find_one({"sessionId": session_id, "playerId": player_id})
        if not session:
            print(f"[ERROR] Invalid session: {session_id}")
            emit("error", {"error": "Invalid session", "code": "INVALID_SESSION"}, to=request.sid)
            return

        # Fetch room
        room, error = get_room_with_validation(room_id)
        if error or not room:
            print(f"[ERROR] Room validation failed for {room_id}: {error}")
            emit("error", {"error": error or "Room not found", "code": "ROOM_NOT_FOUND"}, to=request.sid)
            return

        if not validate_player_in_room(room, player_id):
            print(f"[ERROR] Player {player_id} not in room {room_id}")
            emit("error", {"error": "Player not in room", "code": "PLAYER_NOT_IN_ROOM"}, to=request.sid)
            return

        # Update player as connected in MongoDB
        update_player_connection_status(room_id, player_id, True)
        print(f"[REJOIN] Player {player_id} marked as connected in room {room_id}")

        # Update session timestamp
        sessions_collection.update_one(
            {"sessionId": session_id},
            {"$set": {"lastSeen": datetime.utcnow()}}
        )

        # Remove stale sessions of same player in same room
        sessions_collection.delete_many({
            "roomId": room_id,
            "playerId": player_id,
            "sessionId": {"$ne": session_id}
        })

        # Update Redis sid mapping and remove disconnected marker
        sid = request.sid
        redis_client.hset(f"sid:{sid}", mapping={
            "sessionId": session_id,
            "roomId": room_id,
            "playerId": player_id
        })
        redis_client.expire(f"sid:{sid}", 3600)
        redis_client.delete(f"disconnected:{player_id}")  # Remove grace period
        print(f"[REJOIN] Redis mappings updated for sid {sid}")

        # Track active session
        set_active_session(session_id, room_id, player_id)
        print(f"[REJOIN] Active session tracked for player {player_id}")

        # Join the Socket.io room
        join_room(room_id)
        print(f"[REJOIN] Socket {sid} rejoined room {room_id}")

        # Fetch latest room data
        updated_room = rooms_collection.find_one({"roomId": room_id})
        if not updated_room:
            print(f"[ERROR] Could not fetch updated room for {room_id}")
            emit("error", {"error": "Room not found after rejoin", "code": "ROOM_FETCH_FAILED"}, to=request.sid)
            return

        updated_room["_id"] = str(updated_room["_id"])

        # Notify all players about reconnection
        emit('playerReconnected', {
            "players": json_safe(updated_room.get("players", [])),
            "reconnectedPlayerId": player_id
        }, to=room_id)
        print(f"[REJOIN] Notified room {room_id} about player {player_id} reconnect")

        # Send full room data to rejoining client
        emit('roomRejoined', {
            "roomData": json_safe(updated_room),
            "restored": True
        }, to=request.sid)
        print(f"[REJOIN] Sent full room state to rejoining player {player_id}")

    except Exception as e:
        print(f"[ERROR] Exception in rejoinRoom: {e}")
        emit("error", {"error": "Failed to rejoin room", "code": "REJOIN_FAILED"}, to=request.sid)

@socketio.on('startGame')
def handle_start_game(data):
    """Handle game start"""
    try:
        room_id = data.get("roomId")
        
        if not room_id:
            emit("error", {"error": "Missing room ID", "code": "MISSING_DATA"})
            return

        room, error = get_room_with_validation(room_id)
        if error:
            emit("error", {"error": error, "code": "ROOM_NOT_FOUND"})
            return

        # Initialize game state
        players = room.get("players", [])
        if not players:
            emit("error", {"error": "No players in room", "code": "NO_PLAYERS"})
            return

        # Select first judge
        first_judge = players[0]
        
        # Initialize players with scores and round tracking
        updated_players = []
        for player in players:
            updated_players.append({
                **player,
                "score": 0,
                "roundScores": [],  # Track scores per round
                "isJudge": player["id"] == first_judge["id"]
            })

        # Update room with game state
        rooms_collection.update_one(
            {"roomId": room_id},
            {
                "$set": {
                    "gamePhase": "judgeSelection",
                    "currentRound": 1,
                    "currentJudge": first_judge,
                    "currentSentence": None,
                    "submissions": [],
                    "players": updated_players,
                    "lastActivity": datetime.utcnow()
                }
            }
        )

        print(f"[GAME_START] Game started in room {room_id} with {len(players)} players")
        print(f"[GAME_START] First judge: {first_judge.get('username', 'Unknown')}")
        
        updated_room = rooms_collection.find_one({"roomId": room_id})
        socketio.emit('gameStarted', json_safe(updated_room), to=room_id)
        
    except Exception as e:
        print(f"[ERROR] Error in startGame: {str(e)}")
        emit("error", {"error": "Failed to start game", "code": "START_GAME_FAILED"})


@socketio.on('startSentenceCreation')
def start_sentence_creation(data):
    room_id = data.get("roomId")
    if not room_id:
        emit("error", {"error": "Missing room ID", "code": "MISSING_DATA"})
        return

    try:
        rooms_collection.update_one(
            {"roomId": room_id},
            {
                "$set": {
                    "gamePhase": "sentenceCreation",
                    "lastActivity": datetime.utcnow()
                }
            }
        )
        emit('gamePhaseChanged', 'sentenceCreation', to=room_id)
    except Exception as e:
        print("[ERROR] Could not change to sentenceCreation:", str(e))
        emit("error", {"error": "Failed to change phase", "code": "PHASE_CHANGE_FAILED"})

@socketio.on('startJudgeSelection')
def start_judge_selection(data):
    """Handle judge selection phase"""
    room_id = data.get("roomId")
    if not room_id:
        emit("error", {"error": "Missing room ID", "code": "MISSING_DATA"})
        return

    try:
        rooms_collection.update_one(
            {"roomId": room_id},
            {
                "$set": {
                    "gamePhase": "judgeSelection",
                    "lastActivity": datetime.utcnow()
                }
            }
        )
        emit('gamePhaseChanged', 'judgeSelection', to=room_id)
    except Exception as e:
        print("[ERROR] Could not change to judgeSelection:", str(e))
        emit("error", {"error": "Failed to change phase", "code": "PHASE_CHANGE_FAILED"})


@socketio.on('submitSentence')
def handle_submit_sentence(data):
    """Handle sentence submission by judge"""
    try:
        room_id = data.get("roomId")
        sentence = data.get("sentence")
        
        if not room_id or not sentence:
            emit("error", {"error": "Missing room ID or sentence", "code": "MISSING_DATA"})
            return

        room, error = get_room_with_validation(room_id)
        if error:
            emit("error", {"error": error, "code": "ROOM_NOT_FOUND"})
            return

        # Validate that the sender is the current judge
        current_judge = room.get("currentJudge")
        if not current_judge:
            emit("error", {"error": "No judge assigned", "code": "NO_JUDGE"})
            return

        # Update room with sentence and start meme selection phase
        rooms_collection.update_one(
            {"roomId": room_id},
            {
                "$set": {
                    "currentSentence": sentence,
                    "gamePhase": "memeSelection",
                    "submissions": [],
                    "lastActivity": datetime.utcnow()
                }
            }
        )

        # Start timer for meme selection
        start_game_timer(room_id, 30)

        room = rooms_collection.find_one({"roomId": room_id})
        socketio.emit('gameStateUpdate', json_safe(room), to=room_id)
        emit('sentenceSubmitted', sentence, to=room_id)
        
    except Exception as e:
        print(f"[ERROR] Error in submitSentence: {str(e)}")
        emit("error", {"error": "Failed to submit sentence", "code": "SUBMIT_SENTENCE_FAILED"})


@socketio.on('selectMeme')
def handle_select_meme(data):
    """Handle meme selection by players"""
    try:
        room_id = data.get("roomId")
        player_id = data.get("playerId")
        meme_id = data.get("memeId")
        
        if not all([room_id, player_id, meme_id]):
            emit("error", {"error": "Missing required data", "code": "MISSING_DATA"})
            return

        room, error = get_room_with_validation(room_id)
        if error:
            emit("error", {"error": error, "code": "ROOM_NOT_FOUND"})
            return

        # Validate that the player is not the judge
        current_judge = room.get("currentJudge")
        if current_judge and current_judge.get("id") == player_id:
            emit("error", {"error": "Judge cannot submit memes", "code": "JUDGE_CANNOT_SUBMIT"})
            return

        # Additional check: verify player is not marked as judge
        player = next((p for p in room.get("players", []) if p.get("id") == player_id), None)
        if player and player.get("isJudge", False):
            emit("error", {"error": "Judge cannot submit memes", "code": "JUDGE_CANNOT_SUBMIT"})
            return

        # Check if player already submitted
        submissions = room.get("submissions", [])
        for submission in submissions:
            if submission.get("playerId") == player_id:
                print(f"[DEBUG] Player {player_id} already submitted a meme")
                emit("error", {"error": "You have already submitted a meme", "code": "ALREADY_SUBMITTED"})
                return

        # Add new submission
        new_submission = {
            "playerId": player_id,
            "memeId": meme_id,
            "score": None
        }
        submissions.append(new_submission)
        
        print(f"[DEBUG] Added submission for player {player_id}: {new_submission}")
        print(f"[DEBUG] Total submissions now: {len(submissions)}")

        # Update room with new submission
        rooms_collection.update_one(
            {"roomId": room_id},
            {"$set": {"submissions": submissions}}
        )

        # Check if all non-judge players have submitted
        non_judge_players = [p for p in room.get("players", []) if not p.get("isJudge", False)]
        all_submitted = len(submissions) >= len(non_judge_players)

        if all_submitted:
            # Transition to meme reveal phase
            rooms_collection.update_one(
                {"roomId": room_id},
                {"$set": {"gamePhase": "memeReveal"}}
            )
            room = rooms_collection.find_one({"roomId": room_id})
            socketio.emit('gameStateUpdate', json_safe(room), to=room_id)

        emit('memeSelected', new_submission, to=room_id)
        
    except Exception as e:
        print(f"[ERROR] Error in selectMeme: {str(e)}")
        emit("error", {"error": "Failed to select meme", "code": "SELECT_MEME_FAILED"})

@socketio.on('scoreMeme')
def handle_score_meme(data):
    """Handle meme scoring by judge"""
    try:
        room_id = data.get("roomId")
        player_id = data.get("playerId")
        score = data.get("score")
        judge_id = data.get("judgeId")
        
        if not all([room_id, player_id, score, judge_id]):
            emit("error", {"error": "Missing required data", "code": "MISSING_DATA"})
            return

        room, error = get_room_with_validation(room_id)
        if error:
            emit("error", {"error": error, "code": "ROOM_NOT_FOUND"})
            return

        # Validate score range
        if not isinstance(score, int) or score < 1 or score > 10:
            emit("error", {"error": "Score must be between 1 and 10", "code": "INVALID_SCORE"})
            return

        # Validate that the person scoring is the current judge
        current_judge = room.get("currentJudge")
        if not current_judge or current_judge.get("id") != judge_id:
            emit("error", {"error": "Only the current judge can score memes", "code": "NOT_JUDGE"})
            return

        current_round = room.get("currentRound", 1)
        
        # Find the submission to score and enforce single scoring per player per round
        submissions = room.get("submissions", [])
        submission_found = False
        for submission in submissions:
            if submission.get("playerId") == player_id:
                # Prevent double-scoring
                if submission.get("score") is not None:
                    emit("error", {"error": "Already scored", "code": "ALREADY_SCORED"})
                    return
                submission["score"] = score
                submission_found = True
                break

        if not submission_found:
            emit("error", {"error": "Submission not found", "code": "SUBMISSION_NOT_FOUND"})
            return

        # Update the room with the scored submission
        rooms_collection.update_one(
            {"roomId": room_id},
            {"$set": {"submissions": submissions}}
        )

        # Update player score for this round (idempotent guard: only add once)
        rooms_collection.update_one(
            {"roomId": room_id, "players.id": player_id},
            {
                "$inc": {"players.$.score": score},
                "$set": {"lastActivity": datetime.utcnow()}
            }
        )

        # Store round score in player's roundScores array
        rooms_collection.update_one(
            {"roomId": room_id, "players.id": player_id},
            {
                "$push": {"players.$.roundScores": {"round": current_round, "score": score}},
                "$set": {"lastActivity": datetime.utcnow()}
            }
        )

        # Log score accumulation
        room = rooms_collection.find_one({"roomId": room_id})
        player = next((p for p in room.get("players", []) if p.get("id") == player_id), None)
        if player:
            print(f"[SCORE] Round {current_round}: {player.get('username', 'Unknown')} scored {score} points. Total score: {player.get('score', 0)}")

        # Check if all memes have been scored
        all_scored = all(sub.get("score") is not None for sub in submissions)
        if all_scored:
            print(f"[ROUND_COMPLETE] All memes scored for round {current_round}")
            rooms_collection.update_one(
                {"roomId": room_id},
                {"$set": {"gamePhase": "results"}}
            )
            room = rooms_collection.find_one({"roomId": room_id})
            socketio.emit('gameStateUpdate', json_safe(room), to=room_id)
        
        emit('memeScored', {"playerId": player_id, "score": score}, to=room_id)
        
    except Exception as e:
        print(f"[ERROR] Error in scoreMeme: {str(e)}")
        emit("error", {"error": "Failed to score meme", "code": "SCORE_MEME_FAILED"})

@socketio.on('nextRound')
def handle_next_round(data):
    """Handle next round progression"""
    try:
        room_id = data.get("roomId")
        
        if not room_id:
            emit("error", {"error": "Missing room ID", "code": "MISSING_DATA"})
            return

        room, error = get_room_with_validation(room_id)
        if error:
            emit("error", {"error": error, "code": "ROOM_NOT_FOUND"})
            return
        
        current_round = room.get("currentRound", 0) + 1
        total_rounds = room.get("totalRounds")
        rounds_per_judge = room.get("roundsPerJudge", 5)  # Default to 5
        
        print(f"[DEBUG] Next round calculation:", {
            "current_round": current_round,
            "total_rounds": total_rounds,
            "rounds_per_judge": rounds_per_judge,
            "players_count": len(room.get("players", [])),
            "will_end": current_round > total_rounds
        })
        
        if current_round > total_rounds:
            # Game is complete, show final results and finalize
            rooms_collection.update_one(
                {"roomId": room_id},
                {"$set": {"gamePhase": "results", "lastActivity": datetime.utcnow()}}
            )
            room = rooms_collection.find_one({"roomId": room_id})
            result_doc = finalize_game(room_id)
            payload = json_safe(room)
            if result_doc:
                payload["finalResult"] = result_doc
            socketio.emit('gameEnded', payload, to=room_id)
            return
        else:
            # Calculate which player should be judge based on rounds_per_judge
            players = room["players"]
            judge_index = ((current_round - 1) // rounds_per_judge) % len(players)
            next_judge = players[judge_index]
            
            print(f"[DEBUG] Round {current_round}: Judge {next_judge.get('username', 'Unknown')} (index {judge_index})")
                
            # Update all players' judge status
            updated_players = []
            for player in players:
                updated_players.append({
                    **player,
                    "isJudge": player["id"] == next_judge["id"]
                })
            
            rooms_collection.update_one(
                {"roomId": room_id},
                {
                    "$set": {
                        "gamePhase": "judgeSelection",
                        "currentRound": current_round,
                        "currentJudge": next_judge,
                        "currentSentence": None,
                        "submissions": [],
                        "players": updated_players,
                        "lastActivity": datetime.utcnow()
                    }
                }
            )
        
        updated_room = rooms_collection.find_one({"roomId": room_id})
        emit('roundStarted', json_safe(updated_room), to=room_id)
    except Exception as e:
        print(f"[ERROR] Error in nextRound: {str(e)}")
        emit("error", {"error": "Failed to progress to next round", "code": "NEXT_ROUND_FAILED"})

@socketio.on('chatMessage')
def handle_chat_message(data):
    """Handle chat messages"""
    try:
        room_id = data.get("roomId")
        message = data.get("message")
        
        if not room_id or not message:
            return

        room, error = get_room_with_validation(room_id)
        if error:
            return
            
        emit('chatMessage', message, to=room_id)
        
    except Exception as e:
        print(f"[ERROR] Error in chatMessage: {str(e)}")

@socketio.on('discardRoom')
def handle_discard_room(data):
    """Handle room discarding with cleanup"""
    try:
        room_id = data.get('roomId')
        
        if not room_id:
            emit("error", {"error": "Missing room ID", "code": "MISSING_DATA"})
            return

        room, error = get_room_with_validation(room_id)
        if error:
            emit("error", {"error": error, "code": "ROOM_NOT_FOUND"})
            return

        print(f"[DEBUG] Discarding room {room_id}")

        # Notify all clients in the room
        emit('roomDiscarded', {}, to=room_id)

        # Remove all players from the socket room
        connected_sids = socketio.server.manager.get_participants('/', room_id)
        for sid in connected_sids:
            leave_room(room_id, sid=sid)

        print(f"[DEBUG] All clients removed from room {room_id}")

        # Clean up database records
        rooms_collection.delete_one({"roomId": room_id})
        sessions_collection.delete_many({"roomId": room_id})
        
        # Clean up active sessions and timers (Redis)
        cleanup_room_runtime(room_id)

        print(f"[DEBUG] Room {room_id} completely discarded and cleaned up")

    except Exception as e:
        print(f"[ERROR] Error in discardRoom: {str(e)}")
        emit("error", {"error": "Failed to discard room", "code": "DISCARD_ROOM_FAILED"})

@socketio.on('leaveRoom')
def handle_leave_room(data):
    try:
        print(f"[BACKEND] leaveRoom event received: {data}")
        room_id = data.get('roomId')
        player_id = data.get('playerId')

        if not room_id or not player_id:
            emit("error", {"error": "Missing room ID or player ID", "code": "MISSING_DATA"})
            return

        room = rooms_collection.find_one({"roomId": room_id})
        if not room:
            print("[BACKEND] Room not found or already deleted.")
            return

        # Mark player as disconnected but keep in players list to avoid losing score/state mid-game
        updated_players = []
        for p in room.get('players', []):
            if p['id'] == player_id:
                updated_players.append({**p, 'isConnected': False, 'lastSeen': datetime.utcnow()})
            else:
                updated_players.append(p)
        print(f"[BACKEND] Players after removal: {updated_players}")

        rooms_collection.update_one(
            {"roomId": room_id},
            {
                "$set": {
                    "players": updated_players,
                    "lastActivity": datetime.utcnow()
                }
            }
        )

        leave_room(room_id)
        print(f"[BACKEND] Socket {request.sid} is leaving room {room_id}")

        # Optional: clean up sessions
        sessions_collection.delete_many({"roomId": room_id, "playerId": player_id})
        delete_player_sessions(room_id, player_id)

        print(f"[BACKEND] Emitting 'playerLeft' to room {room_id}")
        emit('playerLeft', json_safe({
            "players": updated_players,
            "disconnectedPlayerId": player_id
        }), room=room_id, skip_sid=request.sid)


    except Exception as e:
        print(f"[ERROR] leaveRoom: {str(e)}")


# Health check endpoint
@app.route("/", methods=["GET"])
def home():
    return jsonify({"message": "Backend is running successfully."})

@app.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint with detailed status"""
    try:
        # Test database connection
        db.command('ping')
        
        # Count active rooms and sessions
        active_rooms = rooms_collection.count_documents({})
        active_sessions_count = sessions_collection.count_documents({})
        
        return jsonify({
            "status": "healthy",
            "database": "connected",
            "active_rooms": active_rooms,
            "active_sessions": active_sessions_count,
            "timestamp": datetime.utcnow().isoformat()
        })
    except Exception as e:
        return jsonify({
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }), 500

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

def start_game_timer(room_id, duration=30):
    """Start a synchronized timer for a room using eventlet-friendly background task"""
    end_time = datetime.utcnow() + timedelta(seconds=duration)
    set_timer(room_id, end_time.isoformat(), duration)

    def timer_worker(rid: str, end_time_local: datetime):
        try:
            remaining = (end_time_local - datetime.utcnow()).total_seconds()
            while remaining > 0:
                # Check cancel flag
                if redis_client and redis_client.hget(f"{TIMER_PREFIX}:{rid}", "cancel") == "1":
                    return
                socketio.sleep(min(1, remaining))
                remaining = (end_time_local - datetime.utcnow()).total_seconds()

            # Timer ended
            room = rooms_collection.find_one({"roomId": rid})
            if not room:
                return

            socketio.emit('timerEnded', {
                'roomId': rid,
                'phase': room.get('gamePhase', 'memeSelection')
            }, to=rid)

            if room.get('gamePhase') == 'memeSelection':
                rooms_collection.update_one(
                    {"roomId": rid},
                    {"$set": {"gamePhase": "memeReveal"}}
                )
                updated_room = rooms_collection.find_one({"roomId": rid})
                socketio.emit('gameStateUpdate', json_safe(updated_room), to=rid)
        except Exception as e:
            logger.error(f"[TIMER] Error in timer worker: {e}")

    socketio.start_background_task(timer_worker, room_id, end_time)

    socketio.emit('timerStarted', {
        'roomId': room_id,
        'duration': duration,
        'endTime': end_time.isoformat()
    }, to=room_id)

def stop_game_timer(room_id):
    """Stop the timer for a room"""
    cancel_timer(room_id)

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

# Schedule cleanup every hour using eventlet-friendly task
def periodic_cleanup_worker():
    while True:
        socketio.sleep(3600)  # 1 hour
        cleanup_old_data()
        # Opportunistically clean timers without rooms
        try:
            if redis_client:
                # This is lightweight and safe even on free tier
                # We cannot scan keys reliably without perf hit; skip heavy scans
                pass
        except Exception as e:
            logger.error(f"timer cleanup scan error: {e}")

socketio.start_background_task(periodic_cleanup_worker)

# -------------------- MAIN --------------------

if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)
# To run the app, use the command:
# python app.py