"""Фактические тренировки и подходы."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, Numeric, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from models.base import Base
from models.mixins import CreatedAtMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from models.exercise import Exercise
    from models.user import User
    from models.workout_plan import WorkoutPlan


class WorkoutSession(UUIDPrimaryKeyMixin, CreatedAtMixin, Base):
    """Зафиксированная тренировка (журнал)."""

    __tablename__ = "workout_sessions"
    __table_args__ = (Index("ix_workout_sessions_user_id", "user_id"),)

    user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    plan_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("workout_plans.id", ondelete="SET NULL"),
        nullable=True,
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    total_volume_kg: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)

    user: Mapped["User"] = relationship(
        "User",
        back_populates="workout_sessions",
        lazy="select",
    )
    plan: Mapped["WorkoutPlan | None"] = relationship(
        "WorkoutPlan",
        back_populates="sessions",
        lazy="select",
    )
    sets: Mapped[list["WorkoutSet"]] = relationship(
        "WorkoutSet",
        back_populates="session",
        lazy="select",
    )


class WorkoutSet(UUIDPrimaryKeyMixin, CreatedAtMixin, Base):
    """Подход в журнале тренировки."""

    __tablename__ = "workout_sets"

    session_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("workout_sessions.id", ondelete="CASCADE"),
        nullable=False,
    )
    exercise_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("exercises.id", ondelete="RESTRICT"),
        nullable=False,
    )
    set_num: Mapped[int] = mapped_column(Integer, nullable=False)
    reps_done: Mapped[int] = mapped_column(Integer, nullable=False)
    weight_kg: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_pr: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    session: Mapped["WorkoutSession"] = relationship(
        "WorkoutSession",
        back_populates="sets",
        lazy="select",
    )
    exercise: Mapped["Exercise"] = relationship(
        "Exercise",
        back_populates="workout_sets",
        lazy="select",
    )
