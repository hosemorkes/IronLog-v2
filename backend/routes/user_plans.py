"""CRUD планов тренировок текущего пользователя."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from database.session import get_db
from dependencies.auth import get_current_user
from models.user import User
from schemas.workout_plan import (
    WorkoutPlanCreate,
    WorkoutPlanDetailResponse,
    WorkoutPlanListResponse,
    WorkoutPlanUpdate,
)

import services.user_plan_service as user_plan_service

router = APIRouter(tags=["user-plans"])


@router.post(
    "",
    response_model=WorkoutPlanDetailResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_plan(
    payload: WorkoutPlanCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> WorkoutPlanDetailResponse:
    """Создать план тренировок."""
    return await user_plan_service.create_user_plan(db, current_user, payload)


@router.get("", response_model=list[WorkoutPlanListResponse])
async def list_plans(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[WorkoutPlanListResponse]:
    """Список планов: свои и назначенные тренером (активные)."""
    return await user_plan_service.list_user_plans(db, current_user)


@router.post(
    "/{plan_id}/duplicate",
    response_model=WorkoutPlanDetailResponse,
    status_code=status.HTTP_201_CREATED,
)
async def duplicate_plan(
    plan_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> WorkoutPlanDetailResponse:
    """Создать копию доступного плана (новый личный план)."""
    return await user_plan_service.duplicate_user_plan(db, current_user, plan_id)


@router.get("/{plan_id}", response_model=WorkoutPlanDetailResponse)
async def get_plan(
    plan_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> WorkoutPlanDetailResponse:
    """Детали плана с блоками упражнений и данными справочника."""
    return await user_plan_service.get_user_plan_detail(db, current_user, plan_id)


@router.put("/{plan_id}", response_model=WorkoutPlanDetailResponse)
async def update_plan(
    plan_id: UUID,
    payload: WorkoutPlanUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> WorkoutPlanDetailResponse:
    """Обновить план (нельзя менять планы, назначенные тренером)."""
    return await user_plan_service.update_user_plan(db, current_user, plan_id, payload)


@router.delete(
    "/{plan_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_model=None,
)
async def delete_plan(
    plan_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> None:
    """Мягкое удаление (только свой план, не назначенный тренером)."""
    await user_plan_service.soft_delete_user_plan(db, current_user, plan_id)
