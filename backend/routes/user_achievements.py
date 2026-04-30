"""Маршруты достижений пользователя."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from database.session import get_db
from dependencies.auth import get_current_user
from models.user import User
from schemas.user_achievement_feed import UserAchievementFeedResponse
from services import user_achievement_feed_service
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(tags=["user-achievements"])


@router.get("", response_model=UserAchievementFeedResponse)
async def list_my_achievements(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    limit: int = Query(default=8, ge=1, le=50),
) -> UserAchievementFeedResponse:
    """Последние разблокированные достижения."""
    return await user_achievement_feed_service.list_recent_achievements(
        db,
        current_user,
        limit=limit,
    )
