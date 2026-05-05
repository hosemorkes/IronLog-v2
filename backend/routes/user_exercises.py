"""Создание кастомных упражнений текущим пользователем."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, status
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from database.session import get_db
from dependencies.auth import get_current_user
from dependencies.infra import get_redis
from models.user import User
from schemas.exercise import ExerciseDetailResponse, ExerciseUserCustomCreate

import services.exercise_service as exercise_service

router = APIRouter(tags=["user-exercises"])


@router.post(
    "",
    response_model=ExerciseDetailResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_my_custom_exercise(
    payload: ExerciseUserCustomCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    redis: Annotated[Redis, Depends(get_redis)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> ExerciseDetailResponse:
    """Создать упражнение в каталог (created_by = текущий пользователь)."""
    return await exercise_service.create_user_custom_exercise(
        db,
        redis,
        payload,
        creator=current_user,
    )
