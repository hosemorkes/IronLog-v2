"""Хеширование паролей, выпуск JWT и учёт refresh-сессий в Redis."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

import bcrypt
from jose import jwt
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.auth_constants import (
    ACCESS_TOKEN_TTL_SECONDS,
    JWT_TYP_ACCESS,
    JWT_TYP_REFRESH,
    REFRESH_TOKEN_TTL_SECONDS,
    redis_refresh_index_key,
    redis_refresh_key,
    redis_access_deny_key,
)
from core.config import Settings, get_settings
from models.user import User

logger = logging.getLogger(__name__)


def hash_password(plain: str) -> str:
    """Хеширует пароль через bcrypt."""
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    """Проверяет пароль против сохранённого хеша."""
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def _utc_exp_timestamp(seconds_from_now: int) -> int:
    return int((datetime.now(timezone.utc) + timedelta(seconds=seconds_from_now)).timestamp())


def encode_jwt(settings: Settings, *, sub: UUID, typ: str, jti: str, ttl_seconds: int) -> str:
    """Собирает подписанный JWT с полями sub, typ, jti, exp."""
    payload = {
        "sub": str(sub),
        "typ": typ,
        "jti": jti,
        "exp": _utc_exp_timestamp(ttl_seconds),
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


async def register_refresh_session(redis: Redis, user_id: UUID, refresh_jti: str) -> None:
    """Сохраняет jti refresh-токена и индексирует по пользователю."""
    rkey = redis_refresh_key(refresh_jti)
    ikey = redis_refresh_index_key(user_id)
    await redis.set(rkey, str(user_id), ex=REFRESH_TOKEN_TTL_SECONDS)
    await redis.sadd(ikey, refresh_jti)
    await redis.expire(ikey, REFRESH_TOKEN_TTL_SECONDS + 3600)


def issue_access_token_only(user_id: UUID) -> str:
    """Выпускает только access JWT (без смены refresh), например после /auth/refresh."""
    settings = get_settings()
    access_jti = str(uuid4())
    return encode_jwt(
        settings,
        sub=user_id,
        typ=JWT_TYP_ACCESS,
        jti=access_jti,
        ttl_seconds=ACCESS_TOKEN_TTL_SECONDS,
    )


async def issue_token_pair(user_id: UUID, redis: Redis | None) -> tuple[str, str]:
    """Выпускает access и refresh JWT; при наличии Redis регистрирует refresh."""
    settings = get_settings()
    access_jti = str(uuid4())
    refresh_jti = str(uuid4())
    access = encode_jwt(
        settings,
        sub=user_id,
        typ=JWT_TYP_ACCESS,
        jti=access_jti,
        ttl_seconds=ACCESS_TOKEN_TTL_SECONDS,
    )
    refresh = encode_jwt(
        settings,
        sub=user_id,
        typ=JWT_TYP_REFRESH,
        jti=refresh_jti,
        ttl_seconds=REFRESH_TOKEN_TTL_SECONDS,
    )
    if redis is not None:
        await register_refresh_session(redis, user_id, refresh_jti)
    return access, refresh


async def load_user_by_email(session: AsyncSession, email_normalized: str) -> User | None:
    """Находит активного пользователя по нормализованному email."""
    res = await session.execute(select(User).where(User.email == email_normalized))
    return res.scalar_one_or_none()


async def validate_refresh_for_user(
    redis: Redis | None,
    user_id: UUID,
    refresh_jti: str,
) -> bool:
    """Проверяет, что refresh jti выдан и не отозван (при Redis); без Redis — доверяем только JWT."""
    if redis is None:
        return True
    stored = await redis.get(redis_refresh_key(refresh_jti))
    return stored is not None and stored == str(user_id)


def decode_token(settings: Settings, token: str) -> dict:
    """
    Декодирует и проверяет подпись JWT.

    Raises:
        JWTError: Неверная подпись или срок действия.
    """
    return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])


async def revoke_refresh_tokens_for_user(redis: Redis, user_id: UUID) -> None:
    """Удаляет все refresh-сессии пользователя из Redis."""
    idx = redis_refresh_index_key(user_id)
    jtis = await redis.smembers(idx)
    if not jtis:
        await redis.delete(idx)
        return
    pipe = redis.pipeline()
    for jti in jtis:
        pipe.delete(redis_refresh_key(jti))
    pipe.delete(idx)
    await pipe.execute()


async def deny_access_jti(redis: Redis, jti: str, exp_unix: int) -> None:
    """Помечает access jti отозванным до момента exp."""
    now = int(datetime.now(timezone.utc).timestamp())
    ttl = max(1, exp_unix - now)
    await redis.set(redis_access_deny_key(jti), "1", ex=ttl)


async def is_access_jti_denied(redis: Redis, jti: str) -> bool:
    """True, если access-токен с данным jti отозван (logout)."""
    raw = await redis.get(redis_access_deny_key(jti))
    return raw is not None
