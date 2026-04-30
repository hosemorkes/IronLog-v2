"""Загрузка файлов упражнений в MinIO."""

from __future__ import annotations

import asyncio
import uuid
from pathlib import PurePosixPath
from uuid import UUID

from fastapi import UploadFile
from minio import Minio

from core.config import Settings


def _build_public_object_url(settings: Settings, bucket: str, object_name: str) -> str:
    """Собирает URL для доступа к объекту (для dev — MINIO_PUBLIC_BASE_URL)."""
    if settings.minio_public_base_url:
        base = settings.minio_public_base_url.rstrip("/")
    else:
        scheme = "https" if settings.minio_use_ssl else "http"
        base = f"{scheme}://{settings.minio_endpoint}"
    safe_name = PurePosixPath(object_name).as_posix()
    return f"{base}/{bucket}/{safe_name}"


async def ensure_exercises_bucket(client: Minio, bucket_name: str) -> None:
    """Создаёт бакет, если его ещё нет."""

    def _ensure() -> None:
        found = client.bucket_exists(bucket_name)
        if not found:
            client.make_bucket(bucket_name)

    await asyncio.to_thread(_ensure)


async def upload_exercise_image_object(
    *,
    client: Minio,
    settings: Settings,
    exercise_id: UUID,
    upload: UploadFile,
    data: bytes,
) -> str:
    """Сохраняет файл под exercises/{exercise_id}/..., возвращает публичный URL."""
    bucket = settings.minio_bucket_exercises
    await ensure_exercises_bucket(client, bucket)
    suffix = PurePosixPath(upload.filename or "image.bin").suffix
    safe_suffix = suffix if suffix and len(suffix) <= 8 else ".bin"
    object_name = f"exercises/{exercise_id}/{uuid.uuid4().hex}{safe_suffix}"

    content_type = upload.content_type or "application/octet-stream"

    def _put() -> None:
        from io import BytesIO

        client.put_object(
            bucket,
            object_name,
            BytesIO(data),
            length=len(data),
            content_type=content_type,
        )

    await asyncio.to_thread(_put)
    return _build_public_object_url(settings, bucket, object_name)
