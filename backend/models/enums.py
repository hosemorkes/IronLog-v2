"""Перечисления домена, которые мапятся в PostgreSQL ENUM."""

from enum import Enum as PyEnum


class UserRole(str, PyEnum):
    """Роль аккаунта в системе."""

    user = "user"
    trainer = "trainer"
    admin = "admin"


class ExerciseDifficulty(str, PyEnum):
    """Сложность упражнения в справочнике."""

    beginner = "beginner"
    intermediate = "intermediate"
    advanced = "advanced"


class TrainerClientStatus(str, PyEnum):
    """Статус связи тренер — клиент."""

    pending = "pending"
    accepted = "accepted"
    rejected = "rejected"


class ConnectionInitiator(str, PyEnum):
    """Кто инициировал запрос на связь."""

    trainer = "trainer"
    client = "client"
