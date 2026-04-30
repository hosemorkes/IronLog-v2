"""Схемы Pydantic для планов тренировок пользователя."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator

from schemas.exercise import ExerciseDetailResponse


class PlanExerciseInput(BaseModel):
    """Упражнение в составе плана (вход)."""

    exercise_id: UUID
    sets: int = Field(ge=1)
    reps: int = Field(ge=1)
    weight_kg: Decimal | None = None
    rest_seconds: int | None = Field(default=None, ge=0)
    order: int = Field(ge=0, description="Порядок выполнения в плане")


class WorkoutPlanCreate(BaseModel):
    """Создание плана."""

    name: str = Field(max_length=255)
    description: str | None = None
    difficulty: str | None = Field(default=None, max_length=64)
    exercises: list[PlanExerciseInput]

    @field_validator("name")
    @classmethod
    def strip_and_require_name(cls, value: str) -> str:
        """Обрезка пробелов; пустое название недопустимо."""
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("Название не может быть пустым")
        return trimmed

    @model_validator(mode="after")
    def unique_exercise_ids(self) -> WorkoutPlanCreate:
        """Один и тот же exercise_id не должен повторяться в одном плане."""
        ids = [e.exercise_id for e in self.exercises]
        if len(ids) != len(set(ids)):
            raise ValueError("Один и тот же exercise_id не может повторяться в плане")
        return self


class WorkoutPlanUpdate(BaseModel):
    """Полное или частичное обновление плана (только свои планы)."""

    name: str | None = Field(default=None, max_length=255)
    description: str | None = None
    difficulty: str | None = Field(default=None, max_length=64)
    exercises: list[PlanExerciseInput] | None = None

    @field_validator("name")
    @classmethod
    def strip_name_when_set(cls, value: str | None) -> str | None:
        """Если name передано — непустое после trim."""
        if value is None:
            return None
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("Название не может быть пустым")
        return trimmed

    @model_validator(mode="after")
    def unique_exercise_ids_when_present(self) -> WorkoutPlanUpdate:
        """Проверка уникальности exercise_id при передаче списка."""
        if self.exercises is None:
            return self
        ids = [e.exercise_id for e in self.exercises]
        if len(ids) != len(set(ids)):
            raise ValueError("Один и тот же exercise_id не может повторяться в плане")
        return self


class PlanExerciseItemResponse(BaseModel):
    """Элемент упражнения в плане с данными справочника."""

    id: UUID
    order: int
    sets: int
    reps: int
    weight_kg: Decimal | None
    rest_seconds: int | None
    exercise: ExerciseDetailResponse


class WorkoutPlanListResponse(BaseModel):
    """Элемент списка планов."""

    id: UUID
    name: str
    description: str | None
    difficulty: str | None
    assigned_by_trainer: bool
    trainer_id: UUID | None
    exercise_count: int
    created_at: datetime
    updated_at: datetime


class WorkoutPlanDetailResponse(BaseModel):
    """План с вложенными упражнениями."""

    id: UUID
    name: str
    description: str | None
    difficulty: str | None
    assigned_by_trainer: bool
    trainer_id: UUID | None
    exercises: list[PlanExerciseItemResponse]
    created_at: datetime
    updated_at: datetime
