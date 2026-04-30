"""Зависимости аутентификации: JWT и проверка ролей."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from core.auth_constants import JWT_TYP_ACCESS
from core.config import get_settings
from database.session import get_db
from dependencies.infra import get_redis_optional
from models.enums import UserRole
from models.user import User
from services import auth_service

_http_bearer_optional = HTTPBearer(auto_error=False)


async def get_current_user_optional(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_http_bearer_optional)],
    db: Annotated[AsyncSession, Depends(get_db)],
    redis: Annotated[Redis | None, Depends(get_redis_optional)],
) -> User | None:
    """Возвращает пользователя по Bearer JWT или None, если токена нет/неверен."""
    if credentials is None:
        return None
    settings = get_settings()
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.secret_key,
            algorithms=[settings.algorithm],
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный или просроченный токен",
            headers={"WWW-Authenticate": "Bearer"},
        ) from None
    typ = payload.get("typ")
    if typ is not None and typ != JWT_TYP_ACCESS:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Ожидался access-токен",
            headers={"WWW-Authenticate": "Bearer"},
        )
    jti = payload.get("jti")
    if redis is not None and isinstance(jti, str) and jti:
        if await auth_service.is_access_jti_denied(redis, jti):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Токен отозван",
                headers={"WWW-Authenticate": "Bearer"},
            )
    sub_raw = payload.get("sub")
    if sub_raw is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Токен не содержит идентификатор пользователя",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        user_id = UUID(sub_raw)
    except (ValueError, TypeError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Некорректный идентификатор в токене",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    row = await db.get(User, user_id)
    if row is None or not row.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Пользователь не найден или отключён",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return row


async def get_current_user(
    user_or_none: Annotated[User | None, Depends(get_current_user_optional)],
) -> User:
    """Текущий пользователь обязателен (JWT Bearer)."""
    if user_or_none is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Требуется авторизация",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user_or_none


async def require_trainer_or_admin(user: Annotated[User, Depends(get_current_user)]) -> User:
    """Роль trainer или admin."""
    if user.role not in (UserRole.trainer, UserRole.admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав: требуется роль тренера или администратора",
        )
    return user


async def require_admin(user: Annotated[User, Depends(get_current_user)]) -> User:
    """Только admin."""
    if user.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав: требуется роль администратора",
        )
    return user
