"""Тела запросов и ответов для signup/login/refresh."""

from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field


class SignupRequest(BaseModel):
    """Регистрация нового пользователя."""

    email: EmailStr
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    """Вход по email и паролю."""

    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class RefreshRequest(BaseModel):
    """Обновление access-токена."""

    refresh_token: str = Field(min_length=32)


class TokenPairResponse(BaseModel):
    """Пара OAuth2-совместимых токенов."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class AccessTokenResponse(BaseModel):
    """Ответ refresh: только новый access."""

    access_token: str
    token_type: str = "bearer"


class LogoutResponse(BaseModel):
    """Подтверждение выхода."""

    ok: bool = True
