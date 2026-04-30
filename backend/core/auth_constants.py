"""Константы JWT и ключей Redis для аутентификации."""

from __future__ import annotations

from uuid import UUID

JWT_TYP_ACCESS = "access"
JWT_TYP_REFRESH = "refresh"

ACCESS_TOKEN_TTL_SECONDS = 24 * 60 * 60
REFRESH_TOKEN_TTL_SECONDS = 90 * 24 * 60 * 60

REDIS_KEY_RT_PREFIX = "ironlog:auth:rt:"
REDIS_KEY_RT_MEMBERS_PREFIX = "ironlog:auth:rt_members:"
REDIS_KEY_AT_DENY_PREFIX = "ironlog:auth:at_deny:"


def redis_refresh_key(jti: str) -> str:
    """Ключ хранения активного refresh-токена (jti)."""
    return f"{REDIS_KEY_RT_PREFIX}{jti}"


def redis_refresh_index_key(user_id: UUID) -> str:
    """Множество jti refresh-токенов пользователя."""
    return f"{REDIS_KEY_RT_MEMBERS_PREFIX}{user_id}"


def redis_access_deny_key(jti: str) -> str:
    """Блокировка access-токена до истечения срока (logout)."""
    return f"{REDIS_KEY_AT_DENY_PREFIX}{jti}"
