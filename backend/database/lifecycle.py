"""Жизненный цикл ресурсов SQLAlchemy, Redis и MinIO для FastAPI lifespan."""

from __future__ import annotations

from contextlib import asynccontextmanager
from dataclasses import dataclass
from logging import Logger
from typing import AsyncIterator

from minio import Minio
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker, create_async_engine

from core.config import Settings


@dataclass(slots=True)
class AppConnections:
    """Подключения, создаваемые при старте API (URLs только из переменных окружения)."""

    engine: AsyncEngine
    session_factory: async_sessionmaker
    redis: Redis
    minio_client: Minio


@asynccontextmanager
async def connection_lifecycle(
    settings: Settings,
    logger: Logger,
) -> AsyncIterator[AppConnections]:
    """Async context manager: engine asyncpg, Redis, MinIO-клиент; корректное закрытие."""
    endpoint_display = settings.minio_endpoint.replace("\n", "")
    logger.info(
        "Инициализация ресурсов: Postgres (DATABASE_URL), Redis (REDIS_URL), "
        "MinIO (%s, MINIO_USE_SSL=%s)",
        endpoint_display,
        settings.minio_use_ssl,
    )
    if settings.rabbitmq_url:
        logger.info(
            "RABBITMQ_URL задан; подключение к брокеру выполняют Dramatiq-воркеры",
        )

    engine = create_async_engine(
        settings.database_url,
        echo=settings.debug,
        pool_pre_ping=True,
    )
    session_factory = async_sessionmaker(
        bind=engine,
        expire_on_commit=False,
        autoflush=False,
        autocommit=False,
    )
    redis = Redis.from_url(
        settings.redis_url,
        encoding="utf-8",
        decode_responses=True,
    )
    minio_client = Minio(
        settings.minio_endpoint,
        access_key=settings.minio_access_key,
        secret_key=settings.minio_secret_key,
        secure=settings.minio_use_ssl,
    )
    connections = AppConnections(
        engine=engine,
        session_factory=session_factory,
        redis=redis,
        minio_client=minio_client,
    )
    try:
        yield connections
    finally:
        logger.info("Закрытие соединений Redis и пула Postgres")
        await redis.aclose()
        await engine.dispose()
