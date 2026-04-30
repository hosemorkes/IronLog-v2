"""Схемы Pydantic для справочника упражнений."""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from models.enums import ExerciseDifficulty


class ExerciseListResponse(BaseModel):
    """Элемент списка упражнений (кешируемый ответ)."""

    id: UUID
    name: str
    name_ru: str
    muscle_group: str
    equipment: str
    difficulty: str
    image_url: str | None
    tags: list[str] = Field(description="Группа мышц + доп. мышцы для тегов")


class ExerciseDetailResponse(BaseModel):
    """Детальное описание упражнения."""

    id: UUID
    name: str
    name_ru: str
    muscle_group: str
    secondary_muscles: list[str] | None
    equipment: str
    difficulty: str
    description: str | None
    technique_steps: Any | None
    image_url: str | None
    gif_url: str | None
    created_by: UUID | None
    is_active: bool
    created_at: datetime


class ExerciseCreate(BaseModel):
    """Создание упражнения (без файлов — отдельная загрузка)."""

    name: str = Field(max_length=255)
    name_ru: str = Field(max_length=255)
    muscle_group: str = Field(max_length=128)
    secondary_muscles: list[str] | None = None
    equipment: str = Field(max_length=128)
    difficulty: ExerciseDifficulty
    description: str | None = None
    technique_steps: Any | None = None


class ExerciseUpdate(BaseModel):
    """Частичное обновление полей упражнения."""

    name: str | None = Field(default=None, max_length=255)
    name_ru: str | None = Field(default=None, max_length=255)
    muscle_group: str | None = Field(default=None, max_length=128)
    secondary_muscles: list[str] | None = None
    equipment: str | None = Field(default=None, max_length=128)
    difficulty: ExerciseDifficulty | None = None
    description: str | None = None
    technique_steps: Any | None = None
    gif_url: str | None = Field(default=None, max_length=1024)

    @field_validator("name", "name_ru")
    @classmethod
    def strip_strings(cls, v: str | None) -> str | None:
        """Пустые строки трактуем как None (не обновляем)."""
        if v is None:
            return None
        stripped = v.strip()
        return stripped if stripped else None
