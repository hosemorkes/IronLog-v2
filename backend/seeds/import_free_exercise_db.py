"""Импорт упражнений из free-exercise-db (локальный JSON) в PostgreSQL и MinIO."""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import sys
from io import BytesIO
from pathlib import Path
from typing import Any
from uuid import UUID, uuid4

import httpx
from minio import Minio
from sqlalchemy import select

from core.config import get_settings
from models.enums import ExerciseDifficulty
from models.exercise import Exercise
from seeds.db import make_engine, make_session_factory
from seeds.import_exercisedb import (
    BATCH_SIZE,
    DIFFICULTY_MAP,
    EQUIPMENT_MAP as _BASE_EQUIPMENT_MAP,
    MUSCLE_MAP as _BASE_MUSCLE_MAP,
    _make_minio_client,
)
from services.storage_service import ensure_exercises_bucket

logger = logging.getLogger(__name__)

DEFAULT_JSON = Path(__file__).resolve().parent / "exercises_translated.json"
IMAGE_BASE_URL = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises"

# Дополнительные ключи free-exercise-db (базовые карты — в import_exercisedb).
FREE_MUSCLE_EXTRA: dict[str, str] = {
    "abdominals": "core",
    "quadriceps": "legs",
    "middle back": "back",
    "lower back": "back",
    "neck": "other",
}

FREE_EQUIPMENT_EXTRA: dict[str, str] = {
    "body only": "bodyweight",
    "kettlebells": "other",
    "bands": "other",
    "exercise ball": "other",
    "foam roll": "other",
    "e-z curl bar": "barbell",
}

MUSCLE_MAP: dict[str, str] = {**_BASE_MUSCLE_MAP, **FREE_MUSCLE_EXTRA}
EQUIPMENT_MAP: dict[str, str] = {**_BASE_EQUIPMENT_MAP, **FREE_EQUIPMENT_EXTRA}


def _map_muscle_primary(primary: list[str] | None) -> str:
    if not primary:
        return "other"
    for raw in primary:
        key = raw.lower().strip()
        if key in MUSCLE_MAP:
            return MUSCLE_MAP[key]
    return "other"


def _map_equipment(raw: str | None) -> str:
    if not raw:
        return "other"
    return EQUIPMENT_MAP.get(raw.lower().strip(), "other")


def _map_secondary(raw_list: list[str] | None) -> list[str] | None:
    if not raw_list:
        return None
    mapped: list[str] = []
    for item in raw_list:
        key = item.lower().strip()
        mapped.append(MUSCLE_MAP.get(key, key))
    return mapped or None


def _load_json(path: Path) -> list[dict[str, Any]]:
    with path.open(encoding="utf-8") as fh:
        data = json.load(fh)
    if not isinstance(data, list):
        msg = f"Ожидался JSON-массив, получено: {type(data).__name__}"
        raise TypeError(msg)
    return data


def _image_remote_url(images: list[str] | None) -> str | None:
    if not images:
        return None
    first = (images[0] or "").strip()
    if not first:
        return None
    return f"{IMAGE_BASE_URL}/{first}"


def _download_image(url: str) -> bytes | None:
    try:
        with httpx.Client(timeout=30.0, follow_redirects=True) as client:
            response = client.get(url)
            if response.status_code != 200:
                logger.warning("Изображение недоступно (%s): %s", response.status_code, url)
                return None
            content_type = response.headers.get("content-type", "")
            if content_type and "image" not in content_type and "octet" not in content_type:
                logger.warning("Неожиданный content-type: %s — %s", content_type, url)
            return response.content
    except httpx.HTTPError as exc:
        logger.warning("Ошибка загрузки изображения %s: %s", url, exc)
        return None


def _upload_image_sync(
    client: Minio,
    bucket: str,
    exercise_id: UUID,
    data: bytes,
) -> str:
    object_name = f"exercises/{exercise_id}/image.jpg"
    client.put_object(
        bucket,
        object_name,
        BytesIO(data),
        length=len(data),
        content_type="image/jpeg",
    )
    return object_name


async def run_import(
    *,
    json_path: Path,
    skip_images: bool,
    limit: int | None,
) -> None:
    settings = get_settings()
    print(f"📥 Загружаем упражнения из {json_path.name}...")
    raw_items = _load_json(json_path)
    if limit is not None:
        raw_items = raw_items[:limit]
    total = len(raw_items)
    print(f"✓ Записей в файле: {total}\n")

    engine = make_engine()
    session_factory = make_session_factory(engine)
    minio_client = _make_minio_client(settings)
    bucket = settings.minio_bucket_exercises
    if not skip_images:
        await ensure_exercises_bucket(minio_client, bucket)

    imported = 0
    skipped = 0
    pending: list[Exercise] = []
    index = 0

    async with session_factory() as session:
        for item in raw_items:
            index += 1
            name = (item.get("name") or "").strip()
            if not name:
                print(f"[{index}/{total}] (без имени) → пропуск")
                skipped += 1
                continue

            existing = await session.execute(
                select(Exercise.id).where(Exercise.name == name).limit(1),
            )
            if existing.scalar_one_or_none() is not None:
                print(f"[{index}/{total}] {name} → дубль, пропуск")
                skipped += 1
                continue

            exercise_id = uuid4()
            muscle_group = _map_muscle_primary(item.get("primaryMuscles"))
            equipment = _map_equipment(item.get("equipment"))
            difficulty = DIFFICULTY_MAP.get(muscle_group, ExerciseDifficulty.beginner)
            name_ru = (item.get("name_ru") or name).strip()
            instructions = item.get("instructions") or []
            technique_steps = instructions if isinstance(instructions, list) else None

            image_path: str | None = None
            image_url_remote = _image_remote_url(item.get("images"))
            if not skip_images and image_url_remote:
                print(f"[{index}/{total}] {name} → ↓ image...", end=" ", flush=True)
                image_data = await asyncio.to_thread(_download_image, image_url_remote)
                if image_data:
                    try:
                        image_path = await asyncio.to_thread(
                            _upload_image_sync,
                            minio_client,
                            bucket,
                            exercise_id,
                            image_data,
                        )
                        print("✓")
                    except Exception as exc:
                        logger.warning("Не удалось загрузить изображение в MinIO для %s: %s", name, exc)
                        print("✗")
                else:
                    print("✗")
            else:
                print(f"[{index}/{total}] {name}")

            exercise = Exercise(
                id=exercise_id,
                name=name,
                name_ru=name_ru,
                muscle_group=muscle_group,
                secondary_muscles=_map_secondary(item.get("secondaryMuscles")),
                equipment=equipment,
                difficulty=difficulty,
                description=None,
                technique_steps=technique_steps,
                image_url=image_path,
                gif_url=None,
                created_by=None,
                is_active=True,
            )
            session.add(exercise)
            pending.append(exercise)
            imported += 1

            if len(pending) >= BATCH_SIZE:
                await session.commit()
                print(f"💾 Батч {len(pending)} сохранён")
                pending.clear()

        if pending:
            await session.commit()
            print(f"💾 Батч {len(pending)} сохранён")

    await engine.dispose()
    print(f"\n✅ Импортировано: {imported}, пропущено (дубли и пустые): {skipped}")


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Импорт упражнений из exercises_translated.json (free-exercise-db)",
    )
    parser.add_argument(
        "--json",
        type=Path,
        default=DEFAULT_JSON,
        help=f"Путь к JSON (по умолчанию: {DEFAULT_JSON.name})",
    )
    parser.add_argument(
        "--skip-images",
        action="store_true",
        help="Импортировать только данные, без загрузки изображений в MinIO",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        metavar="N",
        help="Обработать только первые N упражнений из файла",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> None:
    """Точка входа ``python -m seeds.import_free_exercise_db``."""
    logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(name)s | %(message)s")
    args = _parse_args(argv)
    if not args.json.is_file():
        print(f"Файл не найден: {args.json}", file=sys.stderr)
        sys.exit(1)
    asyncio.run(
        run_import(
            json_path=args.json,
            skip_images=args.skip_images,
            limit=args.limit,
        ),
    )


if __name__ == "__main__":
    main()
