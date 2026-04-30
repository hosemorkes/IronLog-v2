"""Профиль текущего пользователя для клиента."""

from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, EmailStr


class CurrentUserResponse(BaseModel):
    """Публичные поля пользователя (без пароля)."""

    id: UUID
    email: EmailStr
    username: str
