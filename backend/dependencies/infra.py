"""Доступ к Redis и MinIO через app.state."""

from __future__ import annotations

from typing import Annotated

from fastapi import Request
from minio import Minio
from redis.asyncio import Redis


def get_redis(request: Request) -> Redis:
    """Клиент Redis из ресурсов приложения."""
    conn = getattr(request.app.state, "connections", None)
    if conn is None:
        raise RuntimeError("Подключения не инициализированы (lifespan)")
    return conn.redis


def get_redis_optional(request: Request) -> Redis | None:
    """Redis из app.state или ``None`` (режим без инфраструктуры / тесты без сессий)."""
    conn = getattr(request.app.state, "connections", None)
    if conn is None:
        return None
    return conn.redis


def get_minio(request: Request) -> Minio:
    """Клиент MinIO из ресурсов приложения."""
    conn = getattr(request.app.state, "connections", None)
    if conn is None:
        raise RuntimeError("Подключения не инициализированы (lifespan)")
    return conn.minio_client


RedisDep = Annotated[Redis, get_redis]
MinioDep = Annotated[Minio, get_minio]
