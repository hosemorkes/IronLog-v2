"""Схемы Pydantic для тренировочных сессий (журнал выполнения)."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from schemas.exercise import ExerciseDetailResponse


class WorkoutSessionStartBody(BaseModel):
    """Старт тренировки: по плану или «свободный» режим (без plan_id)."""

    plan_id: UUID | None = None


class SessionExercisePreview(BaseModel):
    """Упражнение в ответе на старт аналога плана (или пустой список)."""

    plan_exercise_id: UUID
    order: int
    exercise: ExerciseDetailResponse
    target_sets: int
    target_reps: int
    target_weight_kg: Decimal | None
    rest_seconds: int | None


class WorkoutSessionStartResponse(BaseModel):
    """Идентификатор новой сессии и упражнения по плану."""

    session_id: UUID
    plan_id: UUID | None
    started_at: datetime
    exercises: list[SessionExercisePreview]


class WorkoutSessionListItem(BaseModel):
    """Строка списка / истории сессий."""

    session_id: UUID
    plan_id: UUID | None
    started_at: datetime
    completed_at: datetime | None
    total_volume_kg: Decimal | None


class WorkoutSessionHistoryResponse(BaseModel):
    """Пагинация списка сессий."""

    items: list[WorkoutSessionListItem]
    total: int


class WorkoutSetItemResponse(BaseModel):
    """Подход в детальной сессии."""

    id: UUID
    exercise_id: UUID
    exercise: ExerciseDetailResponse
    set_num: int
    reps_done: int
    weight_kg: Decimal | None
    duration_seconds: int | None
    is_pr: bool


class WorkoutSessionDetailResponse(BaseModel):
    """Детали сессии с подходами."""

    session_id: UUID
    plan_id: UUID | None
    started_at: datetime
    completed_at: datetime | None
    total_volume_kg: Decimal | None
    notes: str | None
    sets: list[WorkoutSetItemResponse]


class WorkoutSetLogBody(BaseModel):
    """Фиксация выполненного подхода."""

    exercise_id: UUID
    set_num: int = Field(ge=1)
    reps_done: int = Field(ge=1)
    weight_kg: Decimal | None = None
    duration_seconds: int | None = Field(default=None, ge=0)


class WorkoutSetLogResponse(BaseModel):
    """Результат логирования подхода (с флагом PR)."""

    id: UUID
    exercise_id: UUID
    exercise: ExerciseDetailResponse
    session_id: UUID
    set_num: int
    reps_done: int
    weight_kg: Decimal | None
    duration_seconds: int | None
    is_pr: bool


class WorkoutSessionCompleteBody(BaseModel):
    """Завершение тренировки."""

    completed_at: datetime | None = Field(
        default=None,
        description="Если не передано — используется текущий момент UTC.",
    )


class WorkoutSessionCompleteResponse(BaseModel):
    """Итог завершения: объём и время окончания."""

    session_id: UUID
    completed_at: datetime
    total_volume_kg: Decimal
