"""Лента недавних достижений пользователя."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class UserAchievementFeedItem(BaseModel):
    """Разблокированное достижение с метаданными справочника."""

    achievement_id: UUID
    code: str
    name: str
    description: str | None
    icon: str | None
    unlocked_at: datetime


class UserAchievementFeedResponse(BaseModel):
    """Список последних ачивок (новые сверху)."""

    items: list[UserAchievementFeedItem] = Field(default_factory=list)
