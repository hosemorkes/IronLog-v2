"""Модель пользователя."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING
from sqlalchemy import Boolean, DateTime, Enum, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from models.base import Base
from models.enums import UserRole
from models.mixins import CreatedAtMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from models.achievement import UserAchievement
    from models.exercise import Exercise
    from models.personal_record import PersonalRecord
    from models.trainer_client import TrainerClientConnection
    from models.workout_plan import WorkoutPlan
    from models.workout_session import WorkoutSession


class User(UUIDPrimaryKeyMixin, CreatedAtMixin, Base):
    """Пользователь приложения (solo, тренер, админ)."""

    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(320), nullable=False, unique=True)
    username: Mapped[str] = mapped_column(String(64), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role", create_constraint=True),
        nullable=False,
        default=UserRole.user,
    )
    fitness_level: Mapped[str | None] = mapped_column(String(64), nullable=True)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    is_trainer: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    specialization: Mapped[str | None] = mapped_column(String(255), nullable=True)
    certification_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    hourly_rate: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    experience_years: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    exercises_created: Mapped[list["Exercise"]] = relationship(
        "Exercise",
        foreign_keys="Exercise.created_by",
        back_populates="creator",
        lazy="select",
    )
    workout_plans: Mapped[list["WorkoutPlan"]] = relationship(
        "WorkoutPlan",
        foreign_keys="WorkoutPlan.user_id",
        back_populates="user",
        lazy="select",
    )
    trainer_plans: Mapped[list["WorkoutPlan"]] = relationship(
        "WorkoutPlan",
        foreign_keys="WorkoutPlan.trainer_id",
        back_populates="trainer",
        lazy="select",
    )
    workout_sessions: Mapped[list["WorkoutSession"]] = relationship(
        "WorkoutSession",
        back_populates="user",
        lazy="select",
    )
    personal_records: Mapped[list["PersonalRecord"]] = relationship(
        "PersonalRecord",
        back_populates="user",
        lazy="select",
    )
    trainer_connections: Mapped[list["TrainerClientConnection"]] = relationship(
        "TrainerClientConnection",
        foreign_keys="TrainerClientConnection.trainer_id",
        back_populates="trainer",
        lazy="select",
    )
    client_connections: Mapped[list["TrainerClientConnection"]] = relationship(
        "TrainerClientConnection",
        foreign_keys="TrainerClientConnection.client_id",
        back_populates="client",
        lazy="select",
    )
    user_achievements: Mapped[list["UserAchievement"]] = relationship(
        "UserAchievement",
        back_populates="user",
        lazy="select",
    )
