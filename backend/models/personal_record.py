"""Личные рекорды по упражнению."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from models.base import Base
from models.mixins import CreatedAtMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from models.exercise import Exercise
    from models.user import User


class PersonalRecord(UUIDPrimaryKeyMixin, CreatedAtMixin, Base):
    """Лучший зафиксированный результат по упражнению."""

    __tablename__ = "personal_records"

    user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    exercise_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("exercises.id", ondelete="CASCADE"),
        nullable=False,
    )
    weight_kg: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    reps: Mapped[int | None] = mapped_column(Integer, nullable=True)
    volume_kg: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    achieved_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    user: Mapped["User"] = relationship(
        "User",
        back_populates="personal_records",
        lazy="select",
    )
    exercise: Mapped["Exercise"] = relationship(
        "Exercise",
        back_populates="personal_records",
        lazy="select",
    )
