import eventlet
eventlet.monkey_patch()
from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
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
from email import encoders
import re
from bson.json_util import dumps, loads
import json
from bson import json_util
from collections import defaultdict
import threading

# Load .env variables
load_dotenv()
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY") 
SENDER_EMAIL = os.getenv("SENDER_EMAIL")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")
# MongoDB direct setup
client = MongoClient("mongodb://127.0.0.1:27017/")
db = client["memegame"]
users_collection = db["users"]
rooms_collection = db["rooms"]
otp_collection = db["otp_verifications"]
contact_collection = db["contact_messages"]
sessions_collection = db["sessions"]

# Rate limiting (basic in-memory IP tracker)
ip_rate_limit = defaultdict(list)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global email stats dictionary
email_stats = {
    "total_sent": 0,
    "total_failed": 0,
    "success_rate": 100.0,
    "error_breakdown": {}
}

# Session management
active_sessions = {}  # {sessionId: {roomId, playerId, lastSeen}}

# Timer management for synchronized game timers
game_timers = {}  # {roomId: {timer_thread, end_time, duration}}

# Initialize Flask
app = Flask(__name__)
CORS(app)

# Socket.IO setup
socketio = SocketIO(app, cors_allowed_origins="*")

import os
from werkzeug.utils import secure_filename
from PIL import Image

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

        # 2. Rate-limit by IP (basic)
        ip = request.remote_addr
        now = datetime.utcnow()
        ip_rate_limit[ip] = [t for t in ip_rate_limit[ip] if now - t < timedelta(minutes=1)]
        if len(ip_rate_limit[ip]) >= 3:
            return jsonify({"success": False, "error": "Too many requests. Please wait and try again."}), 429
        ip_rate_limit[ip].append(now)

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
                time.sleep(2 * (attempt + 1))  # Exponential backoff
                continue
            raise Exception("Failed to connect to email server after multiple attempts.")
            
        except Exception as e:
            logger.error(f"Unexpected SMTP error (attempt {attempt + 1}): {str(e)}")
            if attempt < max_retries - 1:
                time.sleep(2 * (attempt + 1))
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
    """Enhanced OTP sending endpoint with professional email system"""
    
    request_start_time = datetime.utcnow()
    client_ip = request.environ.get('HTTP_X_FORWARDED_FOR', request.remote_addr)
    
    try:
        # Input validation
        data = request.get_json()
        if not data:
            logger.warning(f"Empty request body from IP: {client_ip}")
            return jsonify({
                "error": "Request body is required",
                "error_code": "MISSING_REQUEST_BODY",
                "timestamp": request_start_time.isoformat()
            }), 400
        
        email = data.get("email", "").strip().lower()
        
        # Validate email presence
        if not email:
            logger.warning(f"Missing email in request from IP: {client_ip}")
            return jsonify({
                "error": "Email address is required",
                "error_code": "MISSING_EMAIL",
                "timestamp": request_start_time.isoformat()
            }), 400
        
        # Validate email format
        if not validate_email_format(email):
            logger.warning(f"Invalid email format '{email}' from IP: {client_ip}")
            return jsonify({
                "error": "Please provide a valid email address",
                "error_code": "INVALID_EMAIL_FORMAT",
                "timestamp": request_start_time.isoformat()
            }), 400

        # Check if user exists in database
        user = users_collection.find_one({"email": email})
        if not user:
            logger.warning(f"Password reset attempt for unregistered email: {email}")
            return jsonify({
                "error": "This email address is not registered with us",
                "error_code": "EMAIL_NOT_REGISTERED",
                "suggestion": "Please check your email address or create a new account",
                "timestamp": request_start_time.isoformat()
            }), 404

        # Rate limiting check (optional enhancement)
        recent_otp_check = otp_collection.find_one({
            "email": email,
            "created_at": {"$gte": datetime.utcnow() - timedelta(minutes=1)}
        })
        
        if recent_otp_check:
            logger.warning(f"Rate limit exceeded for email: {email}")
            return jsonify({
                "error": "Please wait before requesting another OTP",
                "error_code": "RATE_LIMIT_EXCEEDED",
                "retry_after_seconds": 60,
                "timestamp": request_start_time.isoformat()
            }), 429

        # Generate OTP and store in database (your existing logic)
        otp = str(random.randint(100000, 999999))
        expiry = datetime.utcnow() + timedelta(minutes=5)

        otp_collection.update_one(
            {"email": email},
            {"$set": {
                "otp": otp, 
                "expires_at": expiry,
                "created_at": datetime.utcnow(),
                "attempts": 0,
                "client_ip": client_ip,
                "is_used": False
            }},
            upsert=True
        )

        # Get user name for personalization
        user_name = user.get("name") or user.get("username") or user.get("first_name")
        
        # Send professional OTP email
        logger.info(f"Sending OTP email to: {email}")
        
        email_success, email_message = send_professional_otp_email(email, otp, user_name)
        
        if email_success:
            # Calculate processing time
            processing_time = (datetime.utcnow() - request_start_time).total_seconds()
            
            logger.info(f"OTP sent successfully to {email} in {processing_time:.2f}s")
            
            # Update statistics
            global email_stats
            email_stats["total_sent"] += 1
            total_attempts = email_stats["total_sent"] + email_stats["total_failed"]
            email_stats["success_rate"] = (email_stats["total_sent"] / total_attempts) * 100
            
            return jsonify({
                "message": "Verification code sent successfully",
                "email": email,
                "expires_in_minutes": 5,
                "processing_time_seconds": round(processing_time, 2),
                "timestamp": datetime.utcnow().isoformat(),
                "request_id": f"otp_{int(time.time())}_{hash(email) % 10000}"
            }), 200
            
        else:
            # Email sending failed
            logger.error(f"Failed to send OTP email to {email}: {email_message}")
            
            # Update statistics
            email_stats["total_failed"] += 1
            error_type = "CONNECTION_FAILED" if "connection" in email_message.lower() else "EMAIL_SEND_FAILED"
            email_stats["error_breakdown"][error_type] = email_stats["error_breakdown"].get(error_type, 0) + 1
            
            total_attempts = email_stats["total_sent"] + email_stats["total_failed"]
            if total_attempts > 0:
                email_stats["success_rate"] = (email_stats["total_sent"] / total_attempts) * 100
            
            # Determine appropriate error message
            if "authentication" in email_message.lower():
                error_message = "Email service authentication failed. Please try again later."
                error_code = "AUTH_FAILED"
            elif "connection" in email_message.lower():
                error_message = "Unable to connect to email service. Please try again later."
                error_code = "CONNECTION_FAILED"
            elif "timeout" in email_message.lower():
                error_message = "Email service timeout. Please try again."
                error_code = "TIMEOUT"
            else:
                error_message = "Failed to send verification code. Please try again."
                error_code = "EMAIL_SEND_FAILED"
            
            return jsonify({
                "error": error_message,
                "error_code": error_code,
                "retry_recommended": True,
                "timestamp": datetime.utcnow().isoformat()
            }), 500

    except Exception as e:
        # Handle unexpected errors
        processing_time = (datetime.utcnow() - request_start_time).total_seconds()
        error_msg = str(e)
        
        logger.error(f"Unexpected error in send_otp: {error_msg}")
        
        # Update statistics
        
        return jsonify({
            "error": "An unexpected error occurred. Please try again.",
            "error_code": "INTERNAL_SERVER_ERROR",
            "processing_time_seconds": round(processing_time, 2),
            "timestamp": datetime.utcnow().isoformat()
        }), 500
@app.route("/api/email-stats", methods=["GET"])
def get_email_stats():
    """Get email sending statistics (for monitoring)"""
    try:
        return jsonify({
            "success": True,
            "stats": email_stats,
            "timestamp": datetime.utcnow().isoformat()
        }), 200
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
    
@app.route("/api/reset-password", methods=["POST"])
def reset_password():
    data = request.get_json()
    email = data.get("email")
    otp = data.get("otp")
    new_password = data.get("new_password")

    record = otp_collection.find_one({"email": email})
    if not record:
        return jsonify({"error": "OTP not requested"}), 400

    if record["otp"] != otp:
        return jsonify({"error": "Invalid OTP"}), 400

    if datetime.utcnow() > record["expires_at"]:
        return jsonify({"error": "OTP expired"}), 400

    # Hash the new password securely (replace this with your existing hash method)
    from werkzeug.security import generate_password_hash
    hashed_pw = generate_password_hash(new_password)

    # Update password
    users_collection.update_one(
        {"email": email},
        {"$set": {"password": hashed_pw}}
    )

    # Remove OTP record (optional but good practice)
    otp_collection.delete_one({"email": email})

    return jsonify({"message": "Password reset successful"}), 200


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
    data = request.get_json()
    username = data.get("username")
    email = data.get("email")
    password = data.get("password")

    if not username or not email or not password:
        return jsonify({"error": "All fields are required"}), 400

    if users_collection.find_one({"email": email}):
        return jsonify({"error": "User already exists"}), 400

    hashed_password = generate_password_hash(password)
    user = {
        "username": username,
        "email": email,
        "password": hashed_password,
        "avatar": f"https://api.dicebear.com/7.x/fun-emoji/svg?seed={username}"
    }
    inserted = users_collection.insert_one(user)

    # ✅ Send welcome email
    now = datetime.now()
    formatted_time = now.strftime("%b %d, %Y %I:%M %p")  # e.g., "May 29, 2025 03:45 PM"
    subject = f"Welcome to MemeGame 🎉  |  {formatted_time}"
    body = ""  # Add your email body content here
    send_email(email, subject, body)

    token = jwt.encode({
        "email": email,
        "exp": datetime.utcnow() + timedelta(days=7)  # Corrected line
    }, JWT_SECRET_KEY, algorithm="HS256")

    return jsonify({
        "token": token,
        "user": {
            "id": str(inserted.inserted_id),
            "username": username,
            "email": email,
            "avatar": user["avatar"]
        }
    }), 201

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
    msg['From'] = sender_email
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
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    user = users_collection.find_one({"email": email})
    if not user:
        return jsonify({"error": "User not found"}), 404

    if not check_password_hash(user["password"], password):
        return jsonify({"error": "Incorrect password"}), 401

    token = jwt.encode({
        "email": email,
        "exp": datetime.utcnow() + timedelta(days=7)
    }, JWT_SECRET_KEY, algorithm="HS256")

    return jsonify({
        "token": token,
        "user": {
            "id": str(user["_id"]),
            "username": user["username"],
            "email": user["email"],
            "avatar": user["avatar"]
        }
    }), 200
# -------------------- SOCKET.IO EVENTS --------------------
def generate_session_id():
    """Generate a unique session ID"""
    return 'session-' + str(int(time.time())) + '-' + ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))

def cleanup_old_sessions():
    """Clean up sessions older than 24 hours"""
    cutoff_time = datetime.utcnow() - timedelta(hours=24)
    sessions_collection.delete_many({"lastSeen": {"$lt": cutoff_time}})

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

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection with proper cleanup"""
    print(f"[DISCONNECT] Client disconnected: {request.sid}")
    sid = request.sid
    
    rooms = list(rooms_collection.find({}))

    for room in rooms:
        updated_players = []
        changed = False

        for player in room.get("players", []):
            # Optional: check if this player had this sid stored
            if player.get("isConnected", True):  # Mark only if previously connected
                player["isConnected"] = False
                player["lastSeen"] = datetime.utcnow()
                changed = True
            updated_players.append(player)

        if changed:
            rooms_collection.update_one(
                {"_id": room["_id"]},
                {"$set": {"players": updated_players}}
            )

            emit('playerDisconnected', {
                "players": json_safe(updated_players),
                "disconnectedSid": sid
            }, to=room["roomId"])

            
            
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

        # Create session record
        session_record = {
            "sessionId": session_id,
            "roomId": room_id,
            "playerId": host["id"],
            "lastSeen": datetime.utcnow(),
            "isHost": True
        }
        sessions_collection.insert_one(session_record)

        # Track active session
        active_sessions[session_id] = {
            "roomId": room_id,
            "playerId": host["id"],
            "lastSeen": datetime.utcnow()
        }

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
    """Join an existing room with connection validation"""
    print(f"[DEBUG] Received 'joinRoom' event with data: {data}")

    try:
        room_id = data.get("roomId")
        player = data.get("player")

        if not room_id or not player:
            print("[ERROR] Missing room ID or player data in 'joinRoom'")
            emit("error", {"error": "Room ID and player info required", "code": "MISSING_DATA"}, to=request.sid)
            return

        # Validate room exists
        room, error = get_room_with_validation(room_id)
        if error:
            print(f"[ERROR] {error} for roomId: {room_id}")
            emit("error", {"error": error, "code": "ROOM_NOT_FOUND"}, to=request.sid)
            return

        # Check if game has already started
        if room.get("gamePhase") != "lobby":
            print(f"[ERROR] Game already started in room {room_id}")
            emit("error", {"error": "Game has already started", "code": "GAME_ALREADY_STARTED"}, to=request.sid)
            return

        player["isConnected"] = True
        player["lastSeen"] = datetime.utcnow()

        # Check if player already in the room
        existing_player_index = next((i for i, p in enumerate(room["players"]) if p["id"] == player["id"]), None)

        session_id = generate_session_id()

        if existing_player_index is not None:
            # Update existing player
            room["players"][existing_player_index].update(player)
            print(f"[DEBUG] Updated existing player {player['id']} in room {room_id}")
        else:
            # Add new player
            room["players"].append(player)
            print(f"[DEBUG] Added new player {player['id']} to room {room_id}")

        # Update room in database
        rooms_collection.update_one(
            {"roomId": room_id},
            {
                "$set": {
                    "players": room["players"],
                    "lastActivity": datetime.utcnow()
                }
            }
        )

        # Create session record
        session_record = {
            "sessionId": session_id,
            "roomId": room_id,
            "playerId": player["id"],
            "lastSeen": datetime.utcnow(),
            "isHost": False
        }
        sessions_collection.insert_one(session_record)

        # Track active session
        active_sessions[session_id] = {
            "roomId": room_id,
            "playerId": player["id"],
            "lastSeen": datetime.utcnow()
        }

        sid = request.sid
        join_room(room_id)
        print(f"[DEBUG] Socket {sid} joined room {room_id}")

        # Get updated room data
        updated_room = rooms_collection.find_one({"roomId": room_id})
        updated_room["_id"] = str(updated_room["_id"])

        # Emit to all players in room
        emit('playerJoined', json_safe(updated_room["players"]), to=room_id)

        # Emit room data to joining player
        emit('roomJoined', {
            "roomData": json_safe(updated_room),
            "sessionId": session_id
        }, to=sid)

        print(f"[DEBUG] Emitted 'playerJoined' to room {room_id} and 'roomJoined' to {sid}")

    except Exception as e:
        print(f"[ERROR] Error in joinRoom: {str(e)}")
        emit("error", {"error": "Failed to join room", "code": "JOIN_FAILED"}, to=request.sid)


@socketio.on('rejoinRoom')
def handle_rejoin_room(data):
    """Handle room rejoining with session validation"""
    print(f"[DEBUG] Received 'rejoinRoom' event with data: {data}")

    try:
        room_id = data.get("roomId")
        player_id = data.get("playerId")
        session_id = data.get("sessionId")

        if not all([room_id, player_id, session_id]):
            print("[ERROR] Missing required data for rejoinRoom")
            emit("error", {"error": "Missing session data", "code": "INVALID_SESSION"}, to=request.sid)
            return

        # Validate session
        session = sessions_collection.find_one({"sessionId": session_id, "playerId": player_id})
        if not session:
            print(f"[ERROR] Invalid session for rejoin: {session_id}")
            emit("error", {"error": "Invalid session", "code": "INVALID_SESSION"}, to=request.sid)
            return

        # Fetch and validate room
        room, error = get_room_with_validation(room_id)
        if error or not room:
            print(f"[ERROR] {error} for roomId: {room_id}")
            emit("error", {"error": error or "Room not found", "code": "ROOM_NOT_FOUND"}, to=request.sid)
            return

        if not validate_player_in_room(room, player_id):
            print(f"[ERROR] Player {player_id} not found in room {room_id}")
            emit("error", {"error": "Player not in room", "code": "PLAYER_NOT_IN_ROOM"}, to=request.sid)
            return

        # Update player connection status
        update_player_connection_status(room_id, player_id, True)

        # Update session timestamp
        sessions_collection.update_one(
            {"sessionId": session_id},
            {"$set": {"lastSeen": datetime.utcnow()}}
        )

        # Update in-memory active sessions
        active_sessions[session_id] = {
            "roomId": room_id,
            "playerId": player_id,
            "lastSeen": datetime.utcnow()
        }

        # Join socket room
        join_room(room_id)
        print(f"[DEBUG] Socket {request.sid} rejoined room {room_id}")

        # Fetch latest room data again from DB
        updated_room = rooms_collection.find_one({"roomId": room_id})
        if not updated_room:
            print(f"[ERROR] Could not find updated room for roomId: {room_id}")
            emit("error", {"error": "Room not found after rejoin", "code": "ROOM_FETCH_FAILED"}, to=request.sid)
            return

        # Convert _id for safe serialization
        updated_room["_id"] = str(updated_room["_id"])

        # Emit reconnection event to all players
        emit('playerReconnected', {
            "players": json_safe(updated_room.get("players", [])),
            "reconnectedPlayerId": player_id
        }, to=room_id)

        # Emit full room data to rejoining player
        emit('roomRejoined', {
            "roomData": json_safe(updated_room),
            "restored": True
        }, to=request.sid)

        print(f"[DEBUG] Player {player_id} successfully rejoined room {room_id}")

    except Exception as e:
        print(f"[ERROR] Error in rejoinRoom: {str(e)}")
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
        
        # Find the submission to score
        submissions = room.get("submissions", [])
        submission_found = False
        
        for submission in submissions:
            if submission.get("playerId") == player_id:
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

        # Update player score for this round
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
            # Game is complete, show final results
            rooms_collection.update_one(
                {"roomId": room_id},
                {"$set": {"gamePhase": "results", "lastActivity": datetime.utcnow()}}
            )
            room = rooms_collection.find_one({"roomId": room_id})
            socketio.emit('gameStateUpdate', json_safe(room), to=room_id)
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
        
        # Clean up active sessions
        sessions_to_remove = [sid for sid, session in active_sessions.items() if session.get("roomId") == room_id]
        for session_id in sessions_to_remove:
            del active_sessions[session_id]

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

        updated_players = [p for p in room.get('players', []) if p['id'] != player_id]
        print(f"[BACKEND] Players after removal: {updated_players}")

        if updated_players:
            rooms_collection.update_one(
                {"roomId": room_id},
                {
                    "$set": {
                        "players": updated_players,
                        "lastActivity": datetime.utcnow()
                    }
                }
            )
        else:
            rooms_collection.delete_one({"roomId": room_id})
            print(f"[BACKEND] Room {room_id} deleted - no players remaining")

        leave_room(room_id)
        print(f"[BACKEND] Socket {request.sid} is leaving room {room_id}")

        # Optional: clean up sessions
        sessions_collection.delete_many({"roomId": room_id, "playerId": player_id})
        for sid in list(active_sessions):
            session = active_sessions[sid]
            if session.get("roomId") == room_id and session.get("playerId") == player_id:
                del active_sessions[sid]

        if updated_players:
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
        # Clean up old rooms (older than 24 hours)
        cutoff_time = datetime.utcnow() - timedelta(hours=24)
        rooms_collection.delete_many({"lastActivity": {"$lt": cutoff_time}})
        
        # Clean up old sessions
        sessions_collection.delete_many({"timestamp": {"$lt": cutoff_time}})
        
        # Clean up old OTP records
        otp_collection.delete_many({"createdAt": {"$lt": cutoff_time}})
        
        print("[CLEANUP] Old data cleaned up successfully")
    except Exception as e:
        print(f"[CLEANUP] Error during cleanup: {str(e)}")

def start_game_timer(room_id, duration=30):
    """Start a synchronized timer for a room"""
    if room_id in game_timers:
        # Stop existing timer
        stop_game_timer(room_id)
    
    end_time = datetime.utcnow() + timedelta(seconds=duration)
    
    def timer_callback():
        try:
            # Check if room still exists
            room = rooms_collection.find_one({"roomId": room_id})
            if not room:
                return
            
            # Emit timer end event
            socketio.emit('timerEnded', {
                'roomId': room_id,
                'phase': room.get('gamePhase', 'memeSelection')
            }, to=room_id)
            
            # If in memeSelection phase, automatically move to memeReveal
            if room.get('gamePhase') == 'memeSelection':
                rooms_collection.update_one(
                    {"roomId": room_id},
                    {"$set": {"gamePhase": "memeReveal"}}
                )
                updated_room = rooms_collection.find_one({"roomId": room_id})
                socketio.emit('gameStateUpdate', json_safe(updated_room), to=room_id)
            
            # Clean up timer
            if room_id in game_timers:
                del game_timers[room_id]
                
        except Exception as e:
            print(f"[TIMER] Error in timer callback: {str(e)}")
    
    # Start timer thread
    timer_thread = threading.Timer(duration, timer_callback)
    timer_thread.daemon = True
    timer_thread.start()
    
    game_timers[room_id] = {
        'timer_thread': timer_thread,
        'end_time': end_time,
        'duration': duration
    }
    
    # Emit timer start event
    socketio.emit('timerStarted', {
        'roomId': room_id,
        'duration': duration,
        'endTime': end_time.isoformat()
    }, to=room_id)

def stop_game_timer(room_id):
    """Stop the timer for a room"""
    if room_id in game_timers:
        timer_data = game_timers[room_id]
        if timer_data['timer_thread'].is_alive():
            timer_data['timer_thread'].cancel()
        del game_timers[room_id]

def get_remaining_time(room_id):
    """Get remaining time for a room's timer"""
    if room_id in game_timers:
        timer_data = game_timers[room_id]
        remaining = (timer_data['end_time'] - datetime.utcnow()).total_seconds()
        return max(0, int(remaining))
    return 0

# Schedule cleanup every hour
import threading
import time

def periodic_cleanup():
    while True:
        time.sleep(3600)  # 1 hour
        cleanup_old_data()

cleanup_thread = threading.Thread(target=periodic_cleanup, daemon=True)
cleanup_thread.start()

# -------------------- MAIN --------------------

if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)
# To run the app, use the command:
# python app.py