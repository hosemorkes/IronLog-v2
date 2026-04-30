"""Шаблоны тренировок и упражнения в плане."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from models.base import Base
from models.mixins import CreatedAtMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from models.exercise import Exercise
    from models.user import User
    from models.workout_session import WorkoutSession


class WorkoutPlan(UUIDPrimaryKeyMixin, CreatedAtMixin, Base):
    """План тренировки пользователя или шаблон."""

    __tablename__ = "workout_plans"

    user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    trainer_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    difficulty: Mapped[str | None] = mapped_column(String(64), nullable=True)
    is_template: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    user: Mapped["User"] = relationship(
        "User",
        foreign_keys=[user_id],
        back_populates="workout_plans",
        lazy="select",
    )
    trainer: Mapped["User | None"] = relationship(
        "User",
        foreign_keys=[trainer_id],
        back_populates="trainer_plans",
        lazy="select",
    )
    exercises: Mapped[list["PlanExercise"]] = relationship(
        "PlanExercise",
        back_populates="plan",
        lazy="select",
    )
    sessions: Mapped[list["WorkoutSession"]] = relationship(
        "WorkoutSession",
        back_populates="plan",
        lazy="select",
    )


class PlanExercise(UUIDPrimaryKeyMixin, CreatedAtMixin, Base):
    """Упражнение в составе конкретного плана."""

    __tablename__ = "plan_exercises"

    plan_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("workout_plans.id", ondelete="CASCADE"),
        nullable=False,
    )
    exercise_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("exercises.id", ondelete="CASCADE"),
        nullable=False,
    )
    order_num: Mapped[int] = mapped_column(Integer, nullable=False)
    sets: Mapped[int] = mapped_column(Integer, nullable=False)
    reps: Mapped[int] = mapped_column(Integer, nullable=False)
    weight_kg: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    rest_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    plan: Mapped["WorkoutPlan"] = relationship(
        "WorkoutPlan",
        back_populates="exercises",
        lazy="select",
    )
    exercise: Mapped["Exercise"] = relationship(
        "Exercise",
        back_populates="plan_entries",
        lazy="select",
    )
