"""Загрузка instructions_ru из JSON в exercises.technique_steps_ru."""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import sys
from pathlib import Path
from typing import Any

from sqlalchemy import select

from models.exercise import Exercise
from seeds.db import make_engine, make_session_factory

logger = logging.getLogger(__name__)

DEFAULT_JSON = Path(__file__).resolve().parent / "exercises_translated.json"
BATCH_SIZE = 50


def _load_json_items(path: Path) -> list[dict[str, Any]]:
    with path.open(encoding="utf-8") as fh:
        data = json.load(fh)
    if not isinstance(data, list):
        msg = f"Ожидался JSON-массив в {path}"
        raise ValueError(msg)
    return data


def _normalize_instructions_ru(raw: Any) -> list[str] | None:
    if not isinstance(raw, list) or not raw:
        return None
    steps: list[str] = []
    for item in raw:
        if isinstance(item, str):
            text = item.strip()
            if text:
                steps.append(text)
    return steps or None


async def run_load(*, json_path: Path) -> None:
    raw_items = _load_json_items(json_path)
    candidates: list[tuple[str, list[str]]] = []
    for item in raw_items:
        name = (item.get("name") or "").strip()
        steps_ru = _normalize_instructions_ru(item.get("instructions_ru"))
        if not name or steps_ru is None:
            continue
        candidates.append((name, steps_ru))

    total = len(candidates)
    if total == 0:
        print("Нет записей с instructions_ru для загрузки.")
        return

    engine = make_engine()
    session_factory = make_session_factory(engine)
    updated = 0
    skipped = 0
    not_found = 0
    pending = 0

    async with session_factory() as session:
        for index, (name, steps_ru) in enumerate(candidates, start=1):
            result = await session.execute(
                select(Exercise).where(Exercise.name == name).limit(1),
            )
            row = result.scalar_one_or_none()
            if row is None:
                not_found += 1
                print(f"[{index}/{total}] {name} -> не найдено в БД")
                continue

            if row.technique_steps_ru == steps_ru:
                skipped += 1
                print(f"[{index}/{total}] {name} -> без изменений")
                continue

            row.technique_steps_ru = steps_ru
            updated += 1
            pending += 1
            print(f"[{index}/{total}] {name} -> обновлено ({len(steps_ru)} шагов)")

            if pending >= BATCH_SIZE:
                await session.commit()
                print(f"Batch saved: {pending} updates")
                pending = 0

        if pending:
            await session.commit()
            print(f"Batch saved: {pending} updates")

    await engine.dispose()
    print(
        f"Done: updated={updated}, skipped={skipped}, "
        f"not_found={not_found}, total={total}",
    )


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Загрузка instructions_ru -> technique_steps_ru из exercises_translated.json",
    )
    parser.add_argument(
        "--file",
        type=Path,
        default=DEFAULT_JSON,
        help="Путь к JSON (по умолчанию seeds/exercises_translated.json)",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> None:
    """Точка входа ``python -m seeds.load_technique_steps_ru``."""
    logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
    args = _parse_args(argv)
    try:
        asyncio.run(run_load(json_path=args.file))
    except Exception as exc:  # noqa: BLE001
        logger.exception("Load failed: %s", exc)
        sys.exit(1)


if __name__ == "__main__":
    main()
