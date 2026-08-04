"""
MemeGame Backend — Application Entry Point

This is the Flask application factory. All route logic lives in:
- routes/auth.py      → Authentication (register, login, OTP, guest)
- routes/api.py       → REST API (dashboard, feedback, contact)
- routes/game_events.py → Socket.IO game loop
"""

import eventlet
eventlet.monkey_patch()

import time
import logging
from flask import Flask, request, g
from flask_cors import CORS
from flask_socketio import SocketIO

from core.database import CORS_ORIGINS, DEBUG_MODE, ensure_indexes
from routes.auth import auth_bp
from routes.api import api_bp
from routes.game_events import register_socket_events
from utils.logger import setup_structured_logging

# --- Logging ---
setup_structured_logging(level=logging.DEBUG if DEBUG_MODE else logging.INFO)
logger = logging.getLogger(__name__)

# --- Flask App ---
app = Flask(__name__)

# --- HTTP Request Observability ---
@app.before_request
def start_timer():
    g.start_time = time.time()


@app.after_request
def log_request_metrics(response):
    if hasattr(g, "start_time"):
        duration_ms = round((time.time() - g.start_time) * 1000, 2)
        logger.info(
            f"HTTP {request.method} {request.path} {response.status_code} ({duration_ms}ms)",
            extra={
                "method": request.method,
                "path": request.path,
                "status_code": response.status_code,
                "duration_ms": duration_ms,
                "ip": request.remote_addr,
            },
        )
    return response

CORS(
    app,
    resources={r"/api/*": {"origins": CORS_ORIGINS}},
    supports_credentials=True
)

# --- Register Blueprints ---
app.register_blueprint(auth_bp)
app.register_blueprint(api_bp)

# --- Socket.IO ---
socketio = SocketIO(
    app,
    cors_allowed_origins=CORS_ORIGINS,
    async_mode="eventlet",
    ping_timeout=40,
    ping_interval=20
)

# --- Register Socket Events ---
register_socket_events(socketio)

# --- Startup ---
ensure_indexes()
logger.info("MemeGame backend initialized successfully")

# --- Entry Point ---
if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000, debug=DEBUG_MODE)
