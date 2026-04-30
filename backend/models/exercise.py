"""Справочник упражнений."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any
from uuid import UUID

from sqlalchemy import Boolean, Enum, ForeignKey, Index, String, Text, Uuid
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from models.base import Base
from models.enums import ExerciseDifficulty
from models.mixins import CreatedAtMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from models.personal_record import PersonalRecord
    from models.user import User
    from models.workout_plan import PlanExercise
    from models.workout_session import WorkoutSet


class Exercise(UUIDPrimaryKeyMixin, CreatedAtMixin, Base):
    """Упражнение из справочника."""

    __tablename__ = "exercises"
    __table_args__ = (Index("ix_exercises_muscle_group", "muscle_group"),)

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    name_ru: Mapped[str] = mapped_column(String(255), nullable=False)
    muscle_group: Mapped[str] = mapped_column(String(128), nullable=False)
    secondary_muscles: Mapped[list[str] | None] = mapped_column(
        ARRAY(Text),
        nullable=True,
    )
    equipment: Mapped[str] = mapped_column(String(128), nullable=False)
    difficulty: Mapped[ExerciseDifficulty] = mapped_column(
        Enum(ExerciseDifficulty, name="exercise_difficulty", create_constraint=True),
        nullable=False,
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    technique_steps: Mapped[list[Any] | dict[str, Any] | None] = mapped_column(
        JSONB,
        nullable=True,
    )
    image_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    gif_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    created_by: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    creator: Mapped["User | None"] = relationship(
        "User",
        foreign_keys=[created_by],
        back_populates="exercises_created",
        lazy="select",
    )
    plan_entries: Mapped[list["PlanExercise"]] = relationship(
        "PlanExercise",
        back_populates="exercise",
        lazy="select",
    )
    workout_sets: Mapped[list["WorkoutSet"]] = relationship(
        "WorkoutSet",
        back_populates="exercise",
        lazy="select",
    )
    personal_records: Mapped[list["PersonalRecord"]] = relationship(
        "PersonalRecord",
        back_populates="exercise",
        lazy="select",
    )
