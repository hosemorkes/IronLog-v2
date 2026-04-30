"""Маршруты прогресса пользователя (дашборд)."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends

from database.session import get_db
from dependencies.auth import get_current_user
from models.user import User
from schemas.user_progress import (
    RecentPrListResponse,
    UserProgressResponse,
    WeeklyProgressDayResponse,
)
from services import user_progress_service
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(tags=["user-progress"])


@router.get("/recent-prs", response_model=RecentPrListResponse)
async def list_recent_prs(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> RecentPrListResponse:
    """Топ недавних личных рекордов по подходам с флагом PR."""
    return await user_progress_service.get_recent_prs(db, current_user, limit=3)


@router.get("/weekly", response_model=list[WeeklyProgressDayResponse])
async def read_weekly_progress(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[WeeklyProgressDayResponse]:
    """Тоннаж и число завершённых сессий по дням текущей недели (Пн–Вс)."""
    return await user_progress_service.get_calendar_week_progress(db, current_user)


@router.get("", response_model=UserProgressResponse)
async def read_progress(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> UserProgressResponse:
    """Сводка тоннажа, недельного графика, серии и активной сессии."""
    return await user_progress_service.get_user_progress(db, current_user)
