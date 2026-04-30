"""Endpoints активной тренировки и журнала сессий."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from database.session import get_db
from dependencies.auth import get_current_user
from models.user import User
from schemas.workout_session import (
    WorkoutSessionCompleteBody,
    WorkoutSessionCompleteResponse,
    WorkoutSessionDetailResponse,
    WorkoutSessionHistoryResponse,
    WorkoutSessionStartBody,
    WorkoutSessionStartResponse,
    WorkoutSetLogBody,
    WorkoutSetLogResponse,
)

import services.user_session_service as user_session_service

router = APIRouter(tags=["user-sessions"])


@router.post("", response_model=WorkoutSessionStartResponse, status_code=status.HTTP_201_CREATED)
async def start_session(
    body: WorkoutSessionStartBody,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> WorkoutSessionStartResponse:
    """Начать тренировку (опционально по плану)."""
    return await user_session_service.start_session(db, current_user, body)


@router.get("", response_model=WorkoutSessionHistoryResponse)
async def list_sessions(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> WorkoutSessionHistoryResponse:
    """История тренировок с пагинацией."""
    return await user_session_service.list_sessions(db, current_user, limit=limit, offset=offset)


@router.get("/{session_id}", response_model=WorkoutSessionDetailResponse)
async def get_session(
    session_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> WorkoutSessionDetailResponse:
    """Детали сессии и залогированные подходы."""
    return await user_session_service.get_session_detail(db, current_user, session_id)


@router.post("/{session_id}/sets", response_model=WorkoutSetLogResponse)
async def log_workout_set(
    session_id: UUID,
    body: WorkoutSetLogBody,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> WorkoutSetLogResponse:
    """Залогировать подход; возможен флаг личного рекорда."""
    return await user_session_service.log_set(db, current_user, session_id, body)


@router.put("/{session_id}", response_model=WorkoutSessionCompleteResponse)
async def complete_session(
    session_id: UUID,
    body: WorkoutSessionCompleteBody,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> WorkoutSessionCompleteResponse:
    """Завершить тренировку: суммарный объём, задачи воркера, WebSocket."""
    return await user_session_service.complete_session(db, current_user, session_id, body.completed_at)
