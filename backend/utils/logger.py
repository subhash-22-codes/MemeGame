"""
Structured JSON logging utility for MemeGame backend.
Formats log outputs as valid JSON strings for cloud observability.
"""

import json
import logging
from datetime import datetime, timezone


class JSONFormatter(logging.Formatter):
    """
    Format log records as valid JSON strings.
    Compatible with cloud log aggregators (Render, Datadog, Grafana/Loki, AWS CloudWatch).
    """

    def format(self, record: logging.LogRecord) -> str:
        log_obj = {
            "timestamp": datetime.fromtimestamp(record.created, timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)

        # Include custom extra context fields if attached to the log record
        extra_keys = [
            "roomId", "playerId", "sessionId", "event",
            "method", "path", "status_code", "duration_ms", "ip", "code", "sid"
        ]
        for key in extra_keys:
            if hasattr(record, key):
                val = getattr(record, key)
                if val is not None:
                    log_obj[key] = val

        return json.dumps(log_obj, ensure_ascii=False)


def setup_structured_logging(level=logging.INFO):
    """Configure the root logger and Flask/Werkzeug loggers to use JSONFormatter."""
    root_logger = logging.getLogger()
    root_logger.setLevel(level)

    # Remove existing handlers to prevent duplicate logging
    for handler in list(root_logger.handlers):
        root_logger.removeHandler(handler)

    console_handler = logging.StreamHandler()
    console_handler.setFormatter(JSONFormatter())
    root_logger.addHandler(console_handler)

    # Ensure werkzeug logger uses the JSON handler
    werkzeug_logger = logging.getLogger("werkzeug")
    werkzeug_logger.handlers = []
    werkzeug_logger.addHandler(console_handler)
    werkzeug_logger.propagate = False
