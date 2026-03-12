"""Configuration for Zen Chat backend.

Reads from environment variables with sensible defaults.
"""

import os

# Production flag: when True, error responses are sanitized (no raw exception text).
PRODUCTION: bool = (
  os.environ.get("ENVIRONMENT") == "production"
  or os.environ.get("RAILWAY_ENVIRONMENT") == "production"
)

# CORS allowed origins. Comma-separated in CORS_ORIGINS env, or default list.
_DEFAULT_CORS_ORIGINS: list[str] = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
  "https://simplebreath.co.uk",
  "https://breath-jet.vercel.app",
]

# Regex for localhost with any port (dev servers often use 5174, 5175, etc.).
CORS_ORIGIN_REGEX: str = r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$"


def _parse_cors_origins() -> list[str]:
  raw = os.environ.get("CORS_ORIGINS", "").strip()
  if not raw:
    return _DEFAULT_CORS_ORIGINS
  return [o.strip() for o in raw.split(",") if o.strip()]


CORS_ORIGINS: list[str] = _parse_cors_origins()

# Rate limit for /api/chat (SlowAPI format, e.g. "20/minute").
RATE_LIMIT_CHAT: str = os.environ.get("ZEN_CHAT_RATE_LIMIT", "20/minute").strip() or "20/minute"

# Input validation limits.
MAX_MESSAGES: int = 50
MAX_CONTENT_LENGTH: int = 4000
