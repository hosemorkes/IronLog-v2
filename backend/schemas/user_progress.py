"""Схемы ответа агрегированного прогресса для дашборда."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class WeeklyDayTonnage(BaseModel):
    """Тоннаж за календарный день (UTC) для столбчатой диаграммы."""

    date: date
    day_label: str = Field(description="Короткая подпись дня, напр. Пн")
    tonnage_kg: float = Field(ge=0)
    is_today: bool


class WeeklyProgressDayResponse(BaseModel):
    """Один день текущей календарной недели (Пн–Вс, UTC): тоннаж и число завершённых сессий."""

    date: date
    volume_kg: float = Field(ge=0)
    workout_count: int = Field(ge=0)
    day_label: str = Field(description="Пн…Вс")
    is_today: bool


class UserProgressResponse(BaseModel):
    """Сводка прогресса: тоннаж, неделя, серия, активная сессия."""

    total_lifetime_tonnage_kg: float = Field(ge=0)
    weekly_tonnage_by_day: list[WeeklyDayTonnage]
    workout_streak_days: int = Field(ge=0)
    workouts_completed_total: int = Field(ge=0)
    workouts_completed_this_month: int = Field(ge=0)
    active_session_id: UUID | None = None


class RecentPrItemResponse(BaseModel):
    """Запись о недавнем личном рекорде (подход с флагом PR)."""

    exercise_id: UUID
    exercise_name: str
    set_num: int
    reps_done: int
    weight_kg: float | None
    volume_kg: float
    achieved_at: datetime


class RecentPrListResponse(BaseModel):
    """До трёх последних PR по дате подхода."""

    items: list[RecentPrItemResponse]
