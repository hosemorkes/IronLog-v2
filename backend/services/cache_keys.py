"""Ключи и TTL кеша Redis."""

import hashlib
import json

EXERCISES_LIST_CACHE_PREFIX = "cache:exercises:"
EXERCISES_LIST_CACHE_TTL_SECONDS = 86400


def exercises_list_cache_key(
    *,
    muscle_group: str | None,
    equipment: str | None,
    difficulty: str | None,
    search: str | None,
    limit: int,
    offset: int,
) -> str:
    """Стабильный ключ по набору параметров списка."""
    payload = {
        "muscle_group": muscle_group or "",
        "equipment": equipment or "",
        "difficulty": difficulty or "",
        "search": search or "",
        "limit": limit,
        "offset": offset,
    }
    raw = json.dumps(payload, sort_keys=True, ensure_ascii=False).encode("utf-8")
    digest = hashlib.sha256(raw).hexdigest()
    return f"{EXERCISES_LIST_CACHE_PREFIX}{digest}"
