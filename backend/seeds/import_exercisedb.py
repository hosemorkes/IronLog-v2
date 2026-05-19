"""Одноразовый импорт упражнений из ExerciseDB (RapidAPI) в PostgreSQL и MinIO."""

from __future__ import annotations

import argparse
import asyncio
import logging
import os
import sys
from io import BytesIO
from typing import Any
from uuid import UUID, uuid4

import httpx
from minio import Minio
from sqlalchemy import select

from core.config import Settings, get_settings
from models.enums import ExerciseDifficulty
from models.exercise import Exercise
from seeds.db import make_engine, make_session_factory
from services.storage_service import ensure_exercises_bucket

logger = logging.getLogger(__name__)

EXERCISEDB_URL = "https://exercisedb.p.rapidapi.com/exercises"
EXERCISEDB_HOST = "exercisedb.p.rapidapi.com"
BATCH_SIZE = 50

MUSCLE_MAP: dict[str, str] = {
    "pectorals": "chest",
    "chest": "chest",
    "lats": "back",
    "upper back": "back",
    "spine": "back",
    "traps": "back",
    "back": "back",
    "delts": "shoulders",
    "shoulders": "shoulders",
    "quads": "legs",
    "glutes": "legs",
    "hamstrings": "legs",
    "calves": "legs",
    "adductors": "legs",
    "abductors": "legs",
    "legs": "legs",
    "biceps": "arms",
    "triceps": "arms",
    "forearms": "arms",
    "abs": "core",
    "waist": "core",
    "cardiovascular system": "cardio",
}

EQUIPMENT_MAP: dict[str, str] = {
    "barbell": "barbell",
    "olympic barbell": "barbell",
    "ez barbell": "barbell",
    "smith machine": "barbell",
    "trap bar": "barbell",
    "dumbbell": "dumbbell",
    "cable": "cable",
    "machine": "machine",
    "leverage machine": "machine",
    "body weight": "bodyweight",
    "assisted": "bodyweight",
    "band": "other",
    "kettlebell": "other",
    "medicine ball": "other",
    "roller": "other",
    "rope": "other",
}

DIFFICULTY_MAP: dict[str, ExerciseDifficulty] = {
    "chest": ExerciseDifficulty.intermediate,
    "back": ExerciseDifficulty.intermediate,
    "legs": ExerciseDifficulty.intermediate,
    "shoulders": ExerciseDifficulty.beginner,
    "arms": ExerciseDifficulty.beginner,
    "core": ExerciseDifficulty.beginner,
    "cardio": ExerciseDifficulty.beginner,
    "other": ExerciseDifficulty.beginner,
}


def _map_muscle(target: str | None, body_part: str | None) -> str:
    for raw in (target, body_part):
        if not raw:
            continue
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


def _fetch_all_exercises(api_key: str) -> list[dict[str, Any]]:
    headers = {
        "X-RapidAPI-Key": api_key,
        "X-RapidAPI-Host": EXERCISEDB_HOST,
    }
    all_rows: list[dict[str, Any]] = []
    offset = 0
    page_limit = 100
    with httpx.Client(timeout=60.0) as client:
        while True:
            response = client.get(
                EXERCISEDB_URL,
                headers=headers,
                params={"limit": page_limit, "offset": offset},
            )
            response.raise_for_status()
            batch = response.json()
            if not isinstance(batch, list):
                msg = f"Неожиданный ответ API: {type(batch).__name__}"
                raise RuntimeError(msg)
            if not batch:
                break
            all_rows.extend(batch)
            if len(batch) < page_limit:
                break
            offset += page_limit
    return all_rows


def _download_gif(url: str) -> bytes | None:
    try:
        with httpx.Client(timeout=30.0, follow_redirects=True) as client:
            response = client.get(url)
            if response.status_code != 200:
                logger.warning("GIF недоступен (%s): %s", response.status_code, url)
                return None
            content_type = response.headers.get("content-type", "")
            if content_type and "image" not in content_type and "octet" not in content_type:
                logger.warning("Неожиданный content-type для GIF: %s", content_type)
            return response.content
    except httpx.HTTPError as exc:
        logger.warning("Ошибка загрузки GIF %s: %s", url, exc)
        return None


def _upload_gif_sync(
    client: Minio,
    bucket: str,
    exercise_id: UUID,
    data: bytes,
) -> str:
    object_name = f"exercises/{exercise_id}/demo.gif"
    client.put_object(
        bucket,
        object_name,
        BytesIO(data),
        length=len(data),
        content_type="image/gif",
    )
    return object_name


def _make_minio_client(settings: Settings) -> Minio:
    return Minio(
        settings.minio_endpoint,
        access_key=settings.minio_access_key,
        secret_key=settings.minio_secret_key,
        secure=settings.minio_use_ssl,
    )


async def run_import(
    *,
    api_key: str,
    skip_gifs: bool,
    limit: int | None,
) -> None:
    settings = get_settings()
    print("📥 Загружаем упражнения из ExerciseDB...")
    raw_items = _fetch_all_exercises(api_key)
    if limit is not None:
        raw_items = raw_items[:limit]
    total = len(raw_items)
    print(f"✓ Получено {total} упражнений\n")

    engine = make_engine()
    session_factory = make_session_factory(engine)
    minio_client = _make_minio_client(settings)
    bucket = settings.minio_bucket_exercises
    if not skip_gifs:
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
            muscle_group = _map_muscle(item.get("target"), item.get("bodyPart"))
            equipment = _map_equipment(item.get("equipment"))
            difficulty = DIFFICULTY_MAP.get(muscle_group, ExerciseDifficulty.beginner)
            instructions = item.get("instructions") or []
            technique_steps = instructions if isinstance(instructions, list) else None

            gif_path: str | None = None
            gif_url_remote = item.get("gifUrl")
            if not skip_gifs and gif_url_remote:
                print(f"[{index}/{total}] {name} → ↓ GIF...", end=" ", flush=True)
                gif_data = await asyncio.to_thread(_download_gif, gif_url_remote)
                if gif_data:
                    try:
                        gif_path = await asyncio.to_thread(
                            _upload_gif_sync,
                            minio_client,
                            bucket,
                            exercise_id,
                            gif_data,
                        )
                        print("✓")
                    except Exception as exc:
                        logger.warning("Не удалось загрузить GIF в MinIO для %s: %s", name, exc)
                        print("✗")
                else:
                    print("✗")
            else:
                print(f"[{index}/{total}] {name}")

            exercise = Exercise(
                id=exercise_id,
                name=name,
                name_ru=name,
                muscle_group=muscle_group,
                secondary_muscles=_map_secondary(item.get("secondaryMuscles")),
                equipment=equipment,
                difficulty=difficulty,
                description=None,
                technique_steps=technique_steps,
                image_url=None,
                gif_url=gif_path,
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
    parser = argparse.ArgumentParser(description="Импорт упражнений из ExerciseDB (RapidAPI)")
    parser.add_argument(
        "--api-key",
        default=os.environ.get("RAPIDAPI_KEY", "").strip() or None,
        help="RapidAPI ключ (или переменная RAPIDAPI_KEY)",
    )
    parser.add_argument(
        "--skip-gifs",
        action="store_true",
        help="Импортировать только данные, без загрузки GIF в MinIO",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        metavar="N",
        help="Обработать только первые N упражнений из API",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> None:
    """Точка входа ``python -m seeds.import_exercisedb``."""
    logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(name)s | %(message)s")
    args = _parse_args(argv)
    if not args.api_key:
        print("Укажите --api-key или переменную окружения RAPIDAPI_KEY", file=sys.stderr)
        sys.exit(1)
    asyncio.run(
        run_import(
            api_key=args.api_key,
            skip_gifs=args.skip_gifs,
            limit=args.limit,
        ),
    )


if __name__ == "__main__":
    main()
