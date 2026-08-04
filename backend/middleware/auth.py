"""
JWT authentication middleware.
Provides decorators for protecting HTTP endpoints and WebSocket connections.
"""

import jwt
import uuid
import logging
from functools import wraps
from flask import request, jsonify, g
from core.database import JWT_SECRET_KEY

logger = logging.getLogger(__name__)


def require_auth(f):
    """
    Decorator that validates JWT Bearer token on HTTP endpoints.
    Sets g.user_id and g.user_email on success.
    Returns 401 if token is missing/invalid/expired.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        
        if not auth_header.startswith("Bearer "):
            return jsonify({"success": False, "error": "Authentication required", "code": "NO_TOKEN"}), 401
        
        token = auth_header.split(" ", 1)[1]
        
        try:
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=["HS256"])
            g.user_id = payload.get("id")
            g.user_email = payload.get("email")
            g.is_guest = payload.get("isGuest", False)
            
            if not g.user_id:
                return jsonify({"success": False, "error": "Invalid token payload", "code": "INVALID_TOKEN"}), 401
                
        except jwt.ExpiredSignatureError:
            return jsonify({"success": False, "error": "Token expired. Please log in again.", "code": "TOKEN_EXPIRED"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"success": False, "error": "Invalid token", "code": "INVALID_TOKEN"}), 401
        
        return f(*args, **kwargs)
    
    return decorated


def verify_socket_token(auth_data: dict) -> dict | None:
    """
    Verify JWT token sent during WebSocket handshake.
    Returns the decoded payload or None if invalid.
    
    Usage in socket connect handler:
        auth_data = request.args  # or from the auth parameter
        user = verify_socket_token(auth_data)
    """
    token = auth_data.get("token", "")
    if not token:
        return None
    
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=["HS256"])
        if payload.get("id"):
            return payload
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError) as e:
        logger.warning(f"[AUTH] Socket token verification failed: {e}")
    
    return None


def create_guest_token(display_name: str) -> tuple[str, dict]:
    """
    Create a short-lived JWT for a guest user.
    Returns (token_string, user_dict).
    """
    from datetime import datetime, timedelta
    
    guest_id = f"guest_{uuid.uuid4().hex[:12]}"
    avatar_url = f"https://api.dicebear.com/7.x/fun-emoji/svg?seed={display_name}"
    
    user_data = {
        "id": guest_id,
        "username": display_name,
        "avatar": avatar_url,
        "isGuest": True
    }
    
    token = jwt.encode({
        "id": guest_id,
        "username": display_name,
        "isGuest": True,
        "exp": datetime.utcnow() + timedelta(hours=24)
    }, JWT_SECRET_KEY, algorithm="HS256")
    
    return token, user_data
