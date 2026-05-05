"""Профиль текущего пользователя для клиента."""

from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator

from models.enums import UserRole


class CurrentUserSelfUpdate(BaseModel):
    """Тело PUT /auth/me — смена отображаемого имени."""

    username: str = Field(max_length=30)

    @field_validator("username")
    @classmethod
    def username_normalized(cls, v: str) -> str:
        s = v.strip()
        if len(s) < 3:
            raise ValueError("Имя пользователя не может быть короче 3 символов")
        return s


class CurrentUserResponse(BaseModel):
    """Публичные поля пользователя (без пароля)."""

    id: UUID
    email: EmailStr
    username: str
    role: UserRole
