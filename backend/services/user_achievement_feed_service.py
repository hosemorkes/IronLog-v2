"""Выборка недавних достижений пользователя."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models.achievement import UserAchievement
from models.user import User
from schemas.user_achievement_feed import UserAchievementFeedItem, UserAchievementFeedResponse


async def list_recent_achievements(
    db: AsyncSession,
    user: User,
    *,
    limit: int = 8,
) -> UserAchievementFeedResponse:
    """Последние разблокированные ачивки (новые сверху)."""
    lim = max(1, min(limit, 50))
    result = await db.execute(
        select(UserAchievement)
        .where(UserAchievement.user_id == user.id)
        .options(selectinload(UserAchievement.achievement))
        .order_by(UserAchievement.unlocked_at.desc())
        .limit(lim),
    )
    rows = result.scalars().all()
    items: list[UserAchievementFeedItem] = []
    for ua in rows:
        ach = ua.achievement
        items.append(
            UserAchievementFeedItem(
                achievement_id=ach.id,
                code=ach.code,
                name=ach.name,
                description=ach.description,
                icon=ach.icon,
                unlocked_at=ua.unlocked_at,
            ),
        )
    return UserAchievementFeedResponse(items=items)
