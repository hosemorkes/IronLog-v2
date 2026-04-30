"""Определения ачивок и факты выдачи пользователю."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Any
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, String, Text, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.schema import UniqueConstraint

from models.base import Base
from models.mixins import CreatedAtMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from models.user import User


class Achievement(UUIDPrimaryKeyMixin, CreatedAtMixin, Base):
    """Справочник достижений."""

    __tablename__ = "achievements"

    code: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    icon: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    condition_type: Mapped[str] = mapped_column(String(64), nullable=False)
    condition_value: Mapped[Any] = mapped_column(JSONB, nullable=True)

    user_records: Mapped[list["UserAchievement"]] = relationship(
        "UserAchievement",
        back_populates="achievement",
        lazy="select",
    )


class UserAchievement(UUIDPrimaryKeyMixin, CreatedAtMixin, Base):
    """Факт получения пользователем достижения."""

    __tablename__ = "user_achievements"
    __table_args__ = (
        UniqueConstraint("user_id", "achievement_id", name="uq_user_achievement_pair"),
    )

    user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    achievement_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("achievements.id", ondelete="CASCADE"),
        nullable=False,
    )
    unlocked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    user: Mapped["User"] = relationship(
        "User",
        back_populates="user_achievements",
        lazy="select",
    )
    achievement: Mapped["Achievement"] = relationship(
        "Achievement",
        back_populates="user_records",
        lazy="select",
    )
