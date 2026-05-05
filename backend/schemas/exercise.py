"""Схемы Pydantic для справочника упражнений."""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from models.enums import ExerciseDifficulty

_USER_CUSTOM_MUSCLE_GROUPS: frozenset[str] = frozenset(
    {"Грудь", "Спина", "Плечи", "Руки", "Ноги", "Пресс", "Кардио"},
)
_USER_CUSTOM_EQUIPMENT: frozenset[str] = frozenset(
    {"Штанга", "Гантели", "Тренажёр", "Своё тело", "Кроссовер"},
)


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


class ExerciseUserCustomCreate(BaseModel):
    """Создание кастомного упражнения обычным пользователем (name_ru = name на сервере)."""

    name: str = Field(max_length=255)
    muscle_group: str = Field(max_length=128)
    equipment: str = Field(max_length=128)
    difficulty: ExerciseDifficulty
    description: str | None = None

    @field_validator("name")
    @classmethod
    def name_ok(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("Укажите название")
        return s

    @field_validator("muscle_group")
    @classmethod
    def muscle_group_ok(cls, v: str) -> str:
        s = v.strip()
        if s not in _USER_CUSTOM_MUSCLE_GROUPS:
            raise ValueError("Некорректная группа мышц")
        return s

    @field_validator("equipment")
    @classmethod
    def equipment_ok(cls, v: str) -> str:
        s = v.strip()
        if s not in _USER_CUSTOM_EQUIPMENT:
            raise ValueError("Некорректное оборудование")
        return s

    @field_validator("description")
    @classmethod
    def description_optional_strip(cls, v: str | None) -> str | None:
        if v is None:
            return None
        s = v.strip()
        return s if s else None


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
