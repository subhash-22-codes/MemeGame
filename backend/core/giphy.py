"""
GIPHY API client with Redis caching.
Caches search results for 30 minutes to avoid blocking the event loop
with repeated HTTP calls during gameplay.
"""

import random
import logging
import requests
from core.database import GIPHY_API_KEY, redis_client

logger = logging.getLogger(__name__)

CACHE_KEY = "giphy:memes:v1"
CACHE_TTL_SECONDS = 1800  # 30 minutes


def get_memes_from_giphy() -> list[dict]:
    """
    Fetch meme GIFs from GIPHY. Uses Redis cache when available.
    
    Strategy:
    1. Check Redis for cached memes (up to 30 min old)
    2. If cache hit, return a shuffled subset
    3. If cache miss, fetch from GIPHY API and cache the results
    4. If GIPHY is down, return cached results even if stale
    5. If everything fails, return empty list
    """
    # Try cache first
    cached = _get_cached_memes()
    if cached and len(cached) >= 20:
        random.shuffle(cached)
        return cached[:45]
    
    # Cache miss — fetch from GIPHY
    fresh_memes = _fetch_from_giphy()
    
    if fresh_memes:
        _cache_memes(fresh_memes)
        random.shuffle(fresh_memes)
        return fresh_memes[:45]
    
    # GIPHY failed — use stale cache if available
    if cached:
        logger.warning("[GIPHY] API failed, using stale cache")
        random.shuffle(cached)
        return cached[:45]
    
    logger.error("[GIPHY] No memes available from any source")
    return []


def _fetch_from_giphy() -> list[dict]:
    """Make the actual GIPHY API call."""
    try:
        if not GIPHY_API_KEY:
            logger.warning("[GIPHY] No API key configured")
            return []

        url = "https://api.giphy.com/v1/gifs/search"
        params = {
            "api_key": GIPHY_API_KEY,
            "q": "reaction",
            "limit": 50,
            "offset": random.randint(0, 200),
            "rating": "r",
            "lang": "en"
        }

        response = requests.get(url, params=params, timeout=5)

        if response.status_code != 200:
            logger.error(f"[GIPHY] API returned status {response.status_code}")
            return []

        data = response.json().get("data", [])
        if not data:
            logger.warning("[GIPHY] API returned empty results")
            return []

        formatted = []
        for meme_data in data:
            try:
                formatted.append({
                    "id": meme_data["id"],
                    "url": meme_data["images"]["fixed_height_small"]["url"],
                    "title": meme_data.get("title") or "Meme"
                })
            except (KeyError, TypeError):
                continue

        return formatted

    except requests.Timeout:
        logger.error("[GIPHY] API request timed out")
        return []
    except Exception as e:
        logger.error(f"[GIPHY] Unexpected error: {e}")
        return []


def _get_cached_memes() -> list[dict] | None:
    """Retrieve cached memes from Redis."""
    try:
        if not redis_client:
            return None
        
        import json
        raw = redis_client.get(CACHE_KEY)
        if raw:
            return json.loads(raw)
    except Exception as e:
        logger.error(f"[GIPHY] Cache read error: {e}")
    return None


def _cache_memes(memes: list[dict]) -> None:
    """Store memes in Redis cache."""
    try:
        if not redis_client:
            return
        
        import json
        redis_client.setex(CACHE_KEY, CACHE_TTL_SECONDS, json.dumps(memes))
        logger.info(f"[GIPHY] Cached {len(memes)} memes (TTL: {CACHE_TTL_SECONDS}s)")
    except Exception as e:
        logger.error(f"[GIPHY] Cache write error: {e}")
