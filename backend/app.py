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
from data.memes import MEMES
import requests
import random

# Configure logging early (before first use)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load .env variables
load_dotenv()
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY") 
SENDER_EMAIL = os.getenv("SENDER_EMAIL")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")
GIPHY_API_KEY = os.getenv("GIPHY_API_KEY")
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
            users_collection.update_one(
                {"email": email},
                {"$set": {"password": generate_password_hash(password)}}
            )
            user_id = str(user["_id"])
        else:  # login
            if not user:
                return jsonify({"error": "User not found"}), 404
            user_id = str(user["_id"])

        # Mark OTP as used
        otp_collection.update_one({"email": email}, {"$set": {"is_used": True}})

        # Issue JWT (valid for 7 days)
        token = jwt.encode({
            "email": email,
            "id": user_id,
            "exp": datetime.utcnow() + timedelta(days=7)
        }, JWT_SECRET_KEY, algorithm="HS256")

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

        logger.info(f"[AUTH] OTP verified for {email}, purpose={purpose}")
        return jsonify({"token": token, "user": payload_user}), 200

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
    """Password-based login only."""
    try:
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

        # Issue JWT (valid for 7 days)
        token = jwt.encode({
            "email": email,
            "id": str(user["_id"]),
            "exp": datetime.utcnow() + timedelta(days=7)
        }, JWT_SECRET_KEY, algorithm="HS256")

        # Response payload
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

def _get_player_and_room(sid: str, room_id: str) -> tuple[dict | None, dict | None, str | None]:
    """
    Utility to securely get the player and room from a socket ID.
    Returns: (player, room, error_message)
    """
    try:
        # 1. Get player_id from the socket ID
        mapping = get_socket_mapping(sid) # This returns a dict
        
        # ⭐️ FIX: Handle bytes from Redis (the master bug)
        def _val(key: str) -> str:
            v = mapping.get(key) or mapping.get(key.encode())
            if isinstance(v, bytes):
                return v.decode()
            return v or ""

        player_id = _val("playerId")
        
        if not player_id:
            logger.error(f"[AUTH_ERROR] No player_id found for sid {sid}. Mapping: {mapping}")
            return None, None, "Player session not found. Please reconnect."

        # 2. Get the room
        room = rooms_collection.find_one({"roomId": room_id})
        if not room:
            return None, None, "Room not found."
            
        # 3. Get the player from the room's player list
        player = next((p for p in room.get("players", []) if p["id"] == player_id), None)
        if not player:
            return None, room, "Player not in this room."
            
        return player, room, None
    except Exception as e:
        logger.error(f"[AUTH_ERROR] Exception in _get_player_and_room: {e}")
        return None, None, "A server error occurred during authentication."


def _update_and_broadcast_state(room_id: str, update_query: dict, new_phase: str):
    """
    A centralized function to update game state in Mongo
    and broadcast the new state to all clients.
    """
    try:
        if "$set" not in update_query:
            update_query["$set"] = {}

        update_query["$set"]["gamePhase"] = new_phase
        update_query["$set"]["lastActivity"] = datetime.utcnow()

        rooms_collection.update_one({"roomId": room_id}, update_query)

        # ⭐️ UPDATED this query to send the new meme list
        room = rooms_collection.find_one(
            {"roomId": room_id},
            {
                "roomId": 1, "players": 1, "gamePhase": 1, "currentRound": 1, 
                "totalRounds": 1, "currentJudge": 1, "currentSentence": 1,
                "submissions": 1, "host": 1, "_id": 0,
                "availableMemes": 1 # ⭐️ ADDED: Send the memes to clients
            }
        )

        if not room:
            logger.error(f"Failed to find room {room_id} after update")
            return

        socketio.emit('gameStateUpdate', json_safe(room), to=room_id)
        logger.info(f"[STATE_CHANGE] Room {room_id} advanced to {new_phase}")

    except Exception as e:
        logger.error(f"Error in _update_and_broadcast_state: {e}")
        socketio.emit("error", {"error": "A server error occurred", "code": "STATE_CHANGE_FAILED"}, to=room_id)

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
                _update_and_broadcast_state(room_id, {}, updated_room.get("gamePhase", "lobby"))
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
        
        room_id = generate_unique_room_id()
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

        room, error = get_room_with_validation(room_id)
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
        player, room, error = _get_player_and_room(sid, room_id)
        
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
        
        # ⭐️ FIX: Skip judge selection entirely. Go straight to writing the prompt!
        _update_and_broadcast_state(room_id, initial_update, "sentenceCreation")

    except Exception as e:
        logger.error(f"[ERROR] Error in startGame: {e}")
        emit("error", {"error": "Failed to start game", "code": "START_GAME_FAILED"}, to=sid)

def get_memes_from_giphy():
    """Fetches memes from GIPHY and formats them."""
    try:
        if not GIPHY_API_KEY:
            logger.warning("No GIPHY_API_KEY. Falling back to hardcoded memes.")
            return random.sample(MEMES, min(len(MEMES), 10))

        # Call the GIPHY API to get 50 popular "reaction" GIFs
        url = "https://api.giphy.com/v1/gifs/search"
        params = {
            "api_key": GIPHY_API_KEY,
            "q": "reaction", # You can change this to "meme", "fail", "lol", etc.
            "limit": 50,
            "rating": "pg-13",
            "lang": "en"
        }
        response = requests.get(url, params=params)
        data = response.json()['data']

        # Format the data to match what our frontend expects
        formatted_memes = []
        for meme_data in data:
            formatted_memes.append({
                "id": meme_data['id'],
                "url": meme_data['images']['fixed_height']['url'],
                "title": meme_data['title'] or "Meme"
            })

        # Return 10 random memes from the 50 we fetched
        return random.sample(formatted_memes, min(len(formatted_memes), 10))

    except Exception as e:
        logger.error(f"GIPHY API error: {e}. Falling back to hardcoded memes.")
        # Fallback to your 15 hardcoded memes if GIPHY fails
        return random.sample(MEMES, min(len(MEMES), 10))


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

        player, room, error = _get_player_and_room(sid, room_id)
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
        _update_and_broadcast_state(room_id, sentence_update, "memeSelection")

    except Exception as e:
        logger.error(f"[ERROR] Error in submitSentence: {str(e)}")
        emit("error", {"error": "Failed to submit sentence", "code": "SUBMIT_SENTENCE_FAILED"}, to=sid)

@socketio.on('selectMeme')
def handle_select_meme(data):
    sid = request.sid
    try:
        room_id = data.get("roomId")
        meme_id = data.get("memeId") 

        player, room, error = _get_player_and_room(sid, room_id)
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
            _update_and_broadcast_state(room_id, update_payload, "memeReveal")
        else:
            _update_and_broadcast_state(room_id, update_payload, "memeSelection")
            
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

        player, room, error = _get_player_and_room(sid, room_id)
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
                _update_and_broadcast_state(room_id, {}, "finalResults")
            else:
                logger.info(f"[ROUND_OVER] Round {current_round} done. Moving to results.")
                _update_and_broadcast_state(room_id, {}, "results")
        else:
            # Still more memes to score in this round
            _update_and_broadcast_state(room_id, {}, "memeReveal")
        
    except Exception as e:
        logger.error(f"[ERROR] Error in scoreMeme: {str(e)}")
        emit("error", {"error": "Failed to score meme", "code": "SCORE_MEME_FAILED"}, to=sid)


@socketio.on('nextRound')
def handle_next_round(data):
    """Host triggers the next round."""
    sid = request.sid
    try:
        room_id = data.get("roomId")
        
        player, room, error = _get_player_and_room(sid, room_id)
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
            _update_and_broadcast_state(room_id, final_update, "finalResults")
            
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

            _update_and_broadcast_state(room_id, next_round_update, "sentenceCreation")
            
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
        player, room, error = _get_player_and_room(sid, room_id)
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
        player, room, error = _get_player_and_room(sid, room_id)
        
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
        # ⭐️ FIX: Use the helper to authenticate the host
        player, room, error = _get_player_and_room(sid, room_id)
        
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
                _update_and_broadcast_state(rid, {}, "memeReveal")

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