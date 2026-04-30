"""Бизнес-логика справочника упражнений."""

from __future__ import annotations

import json
import logging
from typing import Sequence
from uuid import UUID

from fastapi import HTTPException, status
from redis.asyncio import Redis
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.enums import ExerciseDifficulty, UserRole
from models.exercise import Exercise
from models.user import User
from schemas.exercise import (
    ExerciseCreate,
    ExerciseDetailResponse,
    ExerciseListResponse,
    ExerciseUpdate,
)
from services.cache_keys import (
    EXERCISES_LIST_CACHE_PREFIX,
    EXERCISES_LIST_CACHE_TTL_SECONDS,
    exercises_list_cache_key,
)

logger = logging.getLogger(__name__)


def _build_tags(row: Exercise) -> list[str]:
    """Теги: основная группа + вторичные мышцы."""
    tags: list[str] = [row.muscle_group]
    if row.secondary_muscles:
        tags.extend(row.secondary_muscles)
    return tags


def _to_list_response(row: Exercise) -> ExerciseListResponse:
    return ExerciseListResponse(
        id=row.id,
        name=row.name,
        name_ru=row.name_ru,
        muscle_group=row.muscle_group,
        equipment=row.equipment,
        difficulty=row.difficulty.value,
        image_url=row.image_url,
        tags=_build_tags(row),
    )


def _to_detail_response(row: Exercise) -> ExerciseDetailResponse:
    return ExerciseDetailResponse(
        id=row.id,
        name=row.name,
        name_ru=row.name_ru,
        muscle_group=row.muscle_group,
        secondary_muscles=row.secondary_muscles,
        equipment=row.equipment,
        difficulty=row.difficulty.value,
        description=row.description,
        technique_steps=row.technique_steps,
        image_url=row.image_url,
        gif_url=row.gif_url,
        created_by=row.created_by,
        is_active=row.is_active,
        created_at=row.created_at,
    )


def exercise_to_detail_response(row: Exercise) -> ExerciseDetailResponse:
    """Публичное преобразование Exercise ORM → детальный API-ответ."""
    return _to_detail_response(row)


async def invalidate_exercises_list_cache(redis: Redis) -> None:
    """Снимает все кеши списка упражнений после мутаций."""
    async for key in redis.scan_iter(match=f"{EXERCISES_LIST_CACHE_PREFIX}*"):
        await redis.delete(key)


async def list_exercises_public_cached(
    db: AsyncSession,
    redis: Redis,
    *,
    muscle_group: str | None,
    equipment: str | None,
    difficulty: str | None,
    search: str | None,
    limit: int,
    offset: int,
) -> list[ExerciseListResponse]:
    """Список активных упражнений из кеша Redis или из БД."""
    cache_key = exercises_list_cache_key(
        muscle_group=muscle_group,
        equipment=equipment,
        difficulty=difficulty,
        search=search,
        limit=limit,
        offset=offset,
    )
    cached = await redis.get(cache_key)
    if cached is not None:
        try:
            raw = json.loads(cached)
            return [ExerciseListResponse.model_validate(item) for item in raw]
        except (json.JSONDecodeError, ValueError):
            logger.warning("Испорченный кеш по ключу %s — загружаем из БД", cache_key)

    rows = await _select_exercises(
        db,
        muscle_group=muscle_group,
        equipment=equipment,
        difficulty=difficulty,
        search=search,
        limit=limit,
        offset=offset,
        only_active=True,
    )
    results = [_to_list_response(r) for r in rows]
    payload = [r.model_dump(mode="json") for r in results]
    await redis.set(
        cache_key,
        json.dumps(payload, ensure_ascii=False),
        ex=EXERCISES_LIST_CACHE_TTL_SECONDS,
    )
    return results


async def _select_exercises(
    db: AsyncSession,
    *,
    muscle_group: str | None,
    equipment: str | None,
    difficulty: str | None,
    search: str | None,
    limit: int,
    offset: int,
    only_active: bool,
) -> Sequence[Exercise]:
    stmt = select(Exercise)
    if only_active:
        stmt = stmt.where(Exercise.is_active.is_(True))
    if muscle_group:
        stmt = stmt.where(Exercise.muscle_group == muscle_group)
    if equipment:
        stmt = stmt.where(Exercise.equipment == equipment)
    if difficulty:
        try:
            diff_enum = ExerciseDifficulty(difficulty)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Некорректное значение фильтра difficulty",
            ) from exc
        stmt = stmt.where(Exercise.difficulty == diff_enum)
    if search:
        pattern = f"%{search}%"
        stmt = stmt.where(
            or_(Exercise.name.ilike(pattern), Exercise.name_ru.ilike(pattern)),
        )
    stmt = stmt.order_by(Exercise.name.asc()).offset(offset).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()


async def get_exercise_public(
    db: AsyncSession,
    exercise_id: UUID,
) -> ExerciseDetailResponse:
    """Детали активного упражнения или 404."""
    row = await db.get(Exercise, exercise_id)
    if row is None or not row.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Упражнение не найдено")
    return _to_detail_response(row)


async def create_exercise(
    db: AsyncSession,
    redis: Redis,
    payload: ExerciseCreate,
    *,
    creator: User,
) -> ExerciseDetailResponse:
    """Создаёт запись упражнения (роль уже проверена в роутере)."""
    ex = Exercise(
        name=payload.name,
        name_ru=payload.name_ru,
        muscle_group=payload.muscle_group,
        secondary_muscles=payload.secondary_muscles,
        equipment=payload.equipment,
        difficulty=payload.difficulty,
        description=payload.description,
        technique_steps=payload.technique_steps,
        created_by=creator.id,
        is_active=True,
    )
    db.add(ex)
    await db.commit()
    await db.refresh(ex)
    await invalidate_exercises_list_cache(redis)
    return _to_detail_response(ex)


def _ensure_can_modify_exercise(user: User, row: Exercise) -> None:
    """Правило: только admin любые; trainer — только где created_by = self."""
    if user.role == UserRole.admin:
        return
    if user.role == UserRole.trainer:
        if row.created_by is None or row.created_by != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Можно редактировать только свои упражнения",
            )
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Недостаточно прав",
    )


async def update_exercise(
    db: AsyncSession,
    redis: Redis,
    exercise_id: UUID,
    payload: ExerciseUpdate,
    *,
    actor: User,
) -> ExerciseDetailResponse:
    """Обновление полей с проверкой владения."""
    row = await db.get(Exercise, exercise_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Упражнение не найдено")
    _ensure_can_modify_exercise(actor, row)

    updates = payload.model_dump(exclude_unset=True)
    for field_name, value in updates.items():
        setattr(row, field_name, value)
    await db.commit()
    await db.refresh(row)
    await invalidate_exercises_list_cache(redis)
    return _to_detail_response(row)


async def soft_delete_exercise(
    db: AsyncSession,
    redis: Redis,
    exercise_id: UUID,
) -> None:
    """Мягкое удаление только для администратора (роутер гарантирует роль)."""
    row = await db.get(Exercise, exercise_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Упражнение не найдено")
    row.is_active = False
    await db.commit()
    await invalidate_exercises_list_cache(redis)


async def get_exercise_for_modification(
    db: AsyncSession,
    exercise_id: UUID,
    *,
    actor: User,
) -> Exercise:
    """Возвращает Exercise для мутаций с проверкой прав редактирования."""
    row = await db.get(Exercise, exercise_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Упражнение не найдено")
    _ensure_can_modify_exercise(actor, row)
    return row


async def finalize_exercise_image_url(
    db: AsyncSession,
    redis: Redis,
    exercise: Exercise,
    image_url: str,
) -> ExerciseDetailResponse:
    """Сохраняет URL загруженного изображения после put в MinIO."""
    exercise.image_url = image_url
    await db.commit()
    await db.refresh(exercise)
    await invalidate_exercises_list_cache(redis)
    return _to_detail_response(exercise)
