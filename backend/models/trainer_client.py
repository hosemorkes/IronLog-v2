"""Связи тренер — клиент."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import DateTime, Enum, ForeignKey, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from models.base import Base
from models.enums import ConnectionInitiator, TrainerClientStatus
from models.mixins import CreatedAtMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from models.user import User


class TrainerClientConnection(UUIDPrimaryKeyMixin, CreatedAtMixin, Base):
    """Запрос и статус связи между тренером и клиентом."""

    __tablename__ = "trainer_client_connections"

    trainer_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    client_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    status: Mapped[TrainerClientStatus] = mapped_column(
        Enum(TrainerClientStatus, name="trainer_client_status", create_constraint=True),
        nullable=False,
        default=TrainerClientStatus.pending,
    )
    initiated_by: Mapped[ConnectionInitiator] = mapped_column(
        Enum(ConnectionInitiator, name="connection_initiator", create_constraint=True),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    trainer: Mapped["User"] = relationship(
        "User",
        foreign_keys=[trainer_id],
        back_populates="trainer_connections",
        lazy="select",
    )
    client: Mapped["User"] = relationship(
        "User",
        foreign_keys=[client_id],
        back_populates="client_connections",
        lazy="select",
    )
