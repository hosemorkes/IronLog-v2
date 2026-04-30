"""Фабрика AsyncSession из app.state (после успешного lifespan)."""

from collections.abc import AsyncIterator

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession


async def get_db(request: Request) -> AsyncIterator[AsyncSession]:
    """Depends: асинхронная сессия БД из session_factory, созданной в lifespan."""
    conn = getattr(request.app.state, "connections", None)
    if conn is None:
        raise RuntimeError("Подключение к БД не инициализировано (lifespan)")
    factory = conn.session_factory
    async with factory() as session:
        yield session
