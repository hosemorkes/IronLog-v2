"""Маршруты аутентификации."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.auth_constants import JWT_TYP_REFRESH
from core.config import get_settings
from database.session import get_db
from dependencies.auth import get_current_user
from dependencies.infra import get_redis_optional
from models.enums import UserRole
from models.user import User
from schemas.auth_me import CurrentUserResponse
from schemas.auth_tokens import (
    AccessTokenResponse,
    LoginRequest,
    LogoutResponse,
    RefreshRequest,
    SignupRequest,
    TokenPairResponse,
)
from services import auth_service

router = APIRouter(tags=["auth"])
_http_bearer = HTTPBearer(auto_error=True)


@router.get("/me", response_model=CurrentUserResponse)
async def read_me(
    current_user: Annotated[User, Depends(get_current_user)],
) -> CurrentUserResponse:
    """Текущий пользователь по JWT (имя для дашборда и профиля)."""
    return CurrentUserResponse(
        id=current_user.id,
        email=current_user.email,
        username=current_user.username,
    )


@router.post("/signup", response_model=TokenPairResponse, status_code=status.HTTP_201_CREATED)
async def signup(
    body: SignupRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    redis: Annotated[Redis | None, Depends(get_redis_optional)],
) -> TokenPairResponse:
    """Регистрация: уникальные email и username, роль user, выдача токенов."""
    email_norm = body.email.strip().lower()
    username_clean = body.username.strip()
    taken_email = await db.scalar(select(User.id).where(User.email == email_norm))
    if taken_email is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Этот email уже занят",
        )
    taken_username = await db.scalar(select(User.id).where(User.username == username_clean))
    if taken_username is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Это имя пользователя уже занято",
        )
    user = User(
        email=email_norm,
        username=username_clean,
        hashed_password=auth_service.hash_password(body.password),
        role=UserRole.user,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    access, refresh = await auth_service.issue_token_pair(user.id, redis)
    return TokenPairResponse(access_token=access, refresh_token=refresh)


@router.post("/login", response_model=TokenPairResponse)
async def login(
    body: LoginRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    redis: Annotated[Redis | None, Depends(get_redis_optional)],
) -> TokenPairResponse:
    """Вход по email и паролю."""
    email_norm = body.email.strip().lower()
    user = await auth_service.load_user_by_email(db, email_norm)
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный email или пароль",
        )
    if not auth_service.verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный email или пароль",
        )
    access, refresh = await auth_service.issue_token_pair(user.id, redis)
    return TokenPairResponse(access_token=access, refresh_token=refresh)


@router.post("/logout", response_model=LogoutResponse)
async def logout(
    current_user: Annotated[User, Depends(get_current_user)],
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(_http_bearer)],
    redis: Annotated[Redis | None, Depends(get_redis_optional)],
) -> LogoutResponse:
    """
    Выход: при наличии Redis отзывает refresh-сессии пользователя и блокирует текущий access jti.

    Без Redis возвращает 200 без побочных эффектов (только JWT).
    """
    if redis is None:
        return LogoutResponse()
    settings = get_settings()
    try:
        payload = auth_service.decode_token(settings, credentials.credentials)
    except JWTError:
        return LogoutResponse()
    await auth_service.revoke_refresh_tokens_for_user(redis, current_user.id)
    jti = payload.get("jti")
    exp = payload.get("exp")
    if isinstance(jti, str) and jti and isinstance(exp, int):
        await auth_service.deny_access_jti(redis, jti, exp)
    return LogoutResponse()


@router.post("/refresh", response_model=AccessTokenResponse)
async def refresh(
    body: RefreshRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    redis: Annotated[Redis | None, Depends(get_redis_optional)],
) -> AccessTokenResponse:
    """Новый access-токен по действительному refresh-токену."""
    settings = get_settings()
    try:
        payload = auth_service.decode_token(settings, body.refresh_token.strip())
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный или просроченный refresh-токен",
        ) from None
    if payload.get("typ") != JWT_TYP_REFRESH:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Ожидался refresh-токен",
        )
    sub_raw = payload.get("sub")
    jti = payload.get("jti")
    if sub_raw is None or not isinstance(jti, str) or not jti:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Некорректное содержимое токена",
        )
    try:
        user_id = UUID(sub_raw)
    except (ValueError, TypeError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Некорректный идентификатор в токене",
        ) from exc
    user = await db.get(User, user_id)
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Пользователь не найден или отключён",
        )
    if not await auth_service.validate_refresh_for_user(redis, user_id, jti):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh-токен недействителен",
        )
    access = auth_service.issue_access_token_only(user_id)
    return AccessTokenResponse(access_token=access)
