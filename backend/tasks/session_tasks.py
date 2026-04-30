"""Фоновые задачи после завершения тренировки (ачивки и статистика)."""

from __future__ import annotations

import asyncio
import logging
from uuid import UUID

import dramatiq
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from core.config import get_settings

logger = logging.getLogger(__name__)

_worker_engine = None
_worker_session_factory: async_sessionmaker | None = None


def _get_worker_session_factory() -> async_sessionmaker:
    """Ленивая фабрика сессий БД на процесс воркера Dramatiq."""
    global _worker_engine, _worker_session_factory
    if _worker_session_factory is None:
        settings = get_settings()
        _worker_engine = create_async_engine(settings.database_url, pool_pre_ping=True)
        _worker_session_factory = async_sessionmaker(
            bind=_worker_engine,
            expire_on_commit=False,
            autoflush=False,
        )
    return _worker_session_factory


async def _check_achievements_task(user_id: UUID, session_id: UUID) -> None:
    from services import achievement_service

    factory = _get_worker_session_factory()
    async with factory() as db:
        await achievement_service.check_achievements_after_workout(
            user_id,
            session_id,
            db,
        )


@dramatiq.actor
def check_achievements(user_id: str, session_id: str) -> None:
    """Проверить достижения пользователя после сессии (асинхронный сервис БД)."""
    logger.info(
        "check_achievements: user_id=%s session_id=%s",
        user_id,
        session_id,
    )
    asyncio.run(_check_achievements_task(UUID(user_id), UUID(session_id)))


@dramatiq.actor
def update_stats(user_id: str, session_id: str) -> None:
    """Обновить агрегированную статистику пользователя после сессии."""
    logger.info(
        "update_stats: user_id=%s session_id=%s",
        user_id,
        session_id,
    )
