"""
Centralized database connections, config, and shared state.
All modules import from here instead of defining their own connections.
"""

import os
import logging
import redis
from pymongo import MongoClient
from dotenv import load_dotenv
from datetime import datetime
from bson import ObjectId

load_dotenv()

logger = logging.getLogger(__name__)

# --- Configuration ---
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
SENDER_EMAIL = os.getenv("SENDER_EMAIL")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")
GIPHY_API_KEY = os.getenv("GIPHY_API_KEY")
DEBUG_MODE = os.getenv("DEBUG", "false").lower() == "true"

# --- MongoDB ---
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
contact_collection = db["contact_messages"]
sessions_collection = db["sessions"]
game_results_collection = db["game_results"]
feedback_collection = db["feedback"]

# --- MongoDB Indexes ---
def ensure_indexes():
    """Create all necessary indexes on application startup."""
    try:
        otp_collection.create_index("expires_at", expireAfterSeconds=0)
        rooms_collection.create_index("roomId", unique=True)
        sessions_collection.create_index("sessionId", unique=True)
        sessions_collection.create_index("playerId")
        sessions_collection.create_index("roomId")
        game_results_collection.create_index("players.id")
        game_results_collection.create_index("createdAt")
        game_results_collection.create_index("host.id")
        game_results_collection.create_index("winners.id")
        users_collection.create_index("email", unique=True)
        logger.info("[DB] All indexes ensured successfully")
    except Exception as e:
        logger.error(f"[DB] Index creation error: {e}")

# --- Redis ---
REDIS_URL = os.getenv("REDIS_URL")
redis_client: redis.Redis | None = None

if REDIS_URL:
    try:
        redis_client = redis.from_url(
            REDIS_URL,
            decode_responses=True,
            socket_timeout=2,
            socket_connect_timeout=2
        )
        redis_client.ping()
        logger.info("[REDIS] Connected successfully")
    except Exception as e:
        logger.error(f"[REDIS] Connection failed: {e}")
        redis_client = None

# --- In-memory fallbacks (single-worker only) ---
local_socket_store = {}
local_rejoin_store = {}

# --- Constants ---
MAX_PLAYERS = 10
TIMER_PREFIX = "timer"
CORS_ORIGINS = [
    "http://localhost:5173",
    "https://meme-game-six.vercel.app"
]

# --- Shared Utilities ---

def json_safe(obj):
    """Recursively convert MongoDB types to JSON-serializable types."""
    if isinstance(obj, datetime):
        return obj.isoformat()
    elif isinstance(obj, ObjectId):
        return str(obj)
    elif isinstance(obj, list):
        return [json_safe(item) for item in obj]
    elif isinstance(obj, dict):
        return {key: json_safe(value) for key, value in obj.items()}
    return obj


def rate_limit_ip(ip: str, period_seconds: int = 60, max_requests: int = 3) -> bool:
    """Rate limit by IP address using Redis. Returns True if allowed."""
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
