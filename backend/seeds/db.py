"""Подключение к БД для скриптов `python -m seeds.*` из каталога `backend/`."""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker, create_async_engine


def load_database_url() -> str:
    """
    Читает ``DATABASE_URL`` из ``backend/.env`` (или из окружения после load_dotenv).

    Returns:
        Строка подключения SQLAlchemy с драйвером asyncpg.

    Raises:
        RuntimeError: Если переменная не задана.
    """
    backend_root = Path(__file__).resolve().parent.parent
    load_dotenv(backend_root / ".env")
    url = os.environ.get("DATABASE_URL", "").strip()
    if not url:
        msg = "DATABASE_URL не задан. Добавьте его в backend/.env или в окружение."
        raise RuntimeError(msg)
    return url


def make_engine() -> AsyncEngine:
    """Создаёт async-движок с проверкой соединения (pool_pre_ping)."""
    return create_async_engine(load_database_url(), pool_pre_ping=True)


def make_session_factory(engine: AsyncEngine) -> async_sessionmaker:
    """Фабрика сессий для сидов (совместимо с настройками API)."""
    return async_sessionmaker(
        bind=engine,
        expire_on_commit=False,
        autoflush=False,
        autocommit=False,
    )
