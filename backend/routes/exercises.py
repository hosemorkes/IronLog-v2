"""HTTP-эндпоинты справочника упражнений."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from minio import Minio
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import get_settings
from database.session import get_db
from dependencies.auth import require_admin, require_trainer_or_admin
from dependencies.infra import get_minio, get_redis
from models.user import User
from schemas.exercise import (
    ExerciseCreate,
    ExerciseDetailResponse,
    ExerciseListResponse,
    ExerciseUpdate,
)
import services.exercise_service as exercise_service
import services.storage_service as storage_service

router = APIRouter(tags=["exercises"])


@router.get("", response_model=list[ExerciseListResponse])
async def list_exercises(
    db: Annotated[AsyncSession, Depends(get_db)],
    redis: Annotated[Redis, Depends(get_redis)],
    muscle_group: str | None = Query(default=None),
    equipment: str | None = Query(default=None),
    difficulty: str | None = Query(default=None),
    search: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> list[ExerciseListResponse]:
    """Каталог упражнений (Redis: cache:exercises:{hash(params)}, TTL 1 день)."""
    return await exercise_service.list_exercises_public_cached(
        db,
        redis,
        muscle_group=muscle_group,
        equipment=equipment,
        difficulty=difficulty,
        search=search,
        limit=limit,
        offset=offset,
    )


@router.get("/{exercise_id}", response_model=ExerciseDetailResponse)
async def get_exercise(
    exercise_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ExerciseDetailResponse:
    """Публичные детали по id."""
    return await exercise_service.get_exercise_public(db, exercise_id)


@router.post("", response_model=ExerciseDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_exercise_endpoint(
    payload: ExerciseCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    redis: Annotated[Redis, Depends(get_redis)],
    actor: Annotated[User, Depends(require_trainer_or_admin)],
) -> ExerciseDetailResponse:
    """Создание (trainer/admin); загрузку картинки см. POST .../upload-image."""
    return await exercise_service.create_exercise(db, redis, payload, creator=actor)


@router.put("/{exercise_id}", response_model=ExerciseDetailResponse)
async def update_exercise_endpoint(
    exercise_id: UUID,
    payload: ExerciseUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    redis: Annotated[Redis, Depends(get_redis)],
    actor: Annotated[User, Depends(require_trainer_or_admin)],
) -> ExerciseDetailResponse:
    """Обновление: admin — любые; trainer — только свои (created_by)."""
    return await exercise_service.update_exercise(
        db,
        redis,
        exercise_id,
        payload,
        actor=actor,
    )


@router.delete(
    "/{exercise_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_model=None,
)
async def delete_exercise_endpoint(
    exercise_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    redis: Annotated[Redis, Depends(get_redis)],
    _: Annotated[User, Depends(require_admin)],
) -> None:
    """Мягкое удаление (только admin): is_active = False."""
    await exercise_service.soft_delete_exercise(db, redis, exercise_id)


@router.post("/{exercise_id}/upload-image", response_model=ExerciseDetailResponse)
async def upload_exercise_image_endpoint(
    exercise_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    redis: Annotated[Redis, Depends(get_redis)],
    minio: Annotated[Minio, Depends(get_minio)],
    actor: Annotated[User, Depends(require_trainer_or_admin)],
    file: UploadFile = File(..., description='Поле multipart "file"'),
) -> ExerciseDetailResponse:
    """Загрузка файла в MinIO и сохранение публичного image_url."""
    exercise = await exercise_service.get_exercise_for_modification(
        db,
        exercise_id,
        actor=actor,
    )
    content = await file.read()
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Файл пустой")
    settings = get_settings()
    url = await storage_service.upload_exercise_image_object(
        client=minio,
        settings=settings,
        exercise_id=exercise.id,
        upload=file,
        data=content,
    )
    return await exercise_service.finalize_exercise_image_url(db, redis, exercise, url)
