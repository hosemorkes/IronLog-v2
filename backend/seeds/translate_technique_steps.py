"""Перевод technique_steps → technique_steps_ru через Claude API."""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import os
import re
import sys
from pathlib import Path
from typing import Any
from uuid import UUID

import httpx
from dotenv import load_dotenv
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from models.exercise import Exercise
from seeds.db import make_engine, make_session_factory

logger = logging.getLogger(__name__)

ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
CLAUDE_MODEL = "claude-sonnet-4-20250514"
BATCH_SIZE = 20


def _load_api_key(cli_key: str | None) -> str:
    backend_root = Path(__file__).resolve().parent.parent
    load_dotenv(backend_root / ".env")
    key = (cli_key or os.environ.get("ANTHROPIC_API_KEY", "")).strip()
    if not key:
        msg = "Укажите --api-key или переменную окружения ANTHROPIC_API_KEY"
        raise RuntimeError(msg)
    return key


def _normalize_steps(raw: Any) -> list[str]:
    """Приводит technique_steps из JSONB к списку непустых строк."""
    if raw is None:
        return []
    if not isinstance(raw, list):
        return []
    steps: list[str] = []
    for item in raw:
        if isinstance(item, str):
            text = item.strip()
            if text:
                steps.append(text)
        elif isinstance(item, dict) and "text" in item:
            text = str(item["text"]).strip()
            if text:
                steps.append(text)
    return steps


def _extract_json_array(text: str) -> list[str]:
    """Извлекает JSON-массив строк из ответа Claude."""
    cleaned = text.strip()
    fence_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", cleaned)
    if fence_match:
        cleaned = fence_match.group(1).strip()
    parsed = json.loads(cleaned)
    if not isinstance(parsed, list):
        msg = "Ожидался JSON-массив строк"
        raise ValueError(msg)
    result: list[str] = []
    for item in parsed:
        if not isinstance(item, str):
            msg = f"Элемент перевода не строка: {item!r}"
            raise ValueError(msg)
        result.append(item.strip())
    return result


async def _translate_steps(
    client: httpx.AsyncClient,
    *,
    api_key: str,
    exercise_name: str,
    steps: list[str],
) -> list[str]:
    prompt = (
        "Переведи шаги техники выполнения упражнения с английского на русский.\n"
        "Сохраняй точную фитнес-терминологию, порядок шагов и их количество.\n"
        "Верни ТОЛЬКО JSON-массив строк в том же порядке, без markdown и пояснений.\n\n"
        f"Упражнение: {exercise_name}\n"
        f"Шаги (EN): {json.dumps(steps, ensure_ascii=False)}"
    )
    response = await client.post(
        ANTHROPIC_API_URL,
        headers={
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        json={
            "model": CLAUDE_MODEL,
            "max_tokens": 4096,
            "messages": [{"role": "user", "content": prompt}],
        },
        timeout=120.0,
    )
    response.raise_for_status()
    payload = response.json()
    content = payload.get("content")
    if not isinstance(content, list) or not content:
        msg = "Пустой ответ Claude API"
        raise ValueError(msg)
    text_block = content[0]
    if not isinstance(text_block, dict) or text_block.get("type") != "text":
        msg = "Неожиданный формат content в ответе Claude API"
        raise ValueError(msg)
    translated = _extract_json_array(str(text_block["text"]))
    if len(translated) != len(steps):
        msg = (
            f"Число переведённых шагов ({len(translated)}) "
            f"не совпадает с исходным ({len(steps)})"
        )
        raise ValueError(msg)
    return translated


async def _fetch_batch(session_factory: async_sessionmaker, limit: int) -> list[Exercise]:
    async with session_factory() as session:
        stmt = (
            select(Exercise)
            .where(
                Exercise.technique_steps.is_not(None),
                Exercise.technique_steps_ru.is_(None),
            )
            .order_by(Exercise.name.asc())
            .limit(limit)
        )
        result = await session.execute(stmt)
        return list(result.scalars().all())


async def run_translate(*, api_key: str, limit: int | None = None) -> None:
    engine = make_engine()
    session_factory = make_session_factory(engine)
    translated_total = 0
    skipped_total = 0
    processed_total = 0

    async with httpx.AsyncClient() as client:
        while True:
            if limit is not None and processed_total >= limit:
                break

            batch_limit = BATCH_SIZE
            if limit is not None:
                batch_limit = min(BATCH_SIZE, limit - processed_total)

            rows = await _fetch_batch(session_factory, batch_limit)
            if not rows:
                break

            async with session_factory() as session:
                for row in rows:
                    steps_en = _normalize_steps(row.technique_steps)
                    if not steps_en:
                        skipped_total += 1
                        logger.info("Пропуск %s — пустые technique_steps", row.name)
                        continue

                    exercise_label = row.name_ru.strip() or row.name
                    try:
                        steps_ru = await _translate_steps(
                            client,
                            api_key=api_key,
                            exercise_name=exercise_label,
                            steps=steps_en,
                        )
                    except (httpx.HTTPError, ValueError, json.JSONDecodeError) as exc:
                        logger.exception(
                            "Ошибка перевода %s (%s): %s",
                            row.name,
                            row.id,
                            exc,
                        )
                        skipped_total += 1
                        continue

                    db_row = await session.get(Exercise, UUID(str(row.id)))
                    if db_row is None:
                        skipped_total += 1
                        continue
                    db_row.technique_steps_ru = steps_ru
                    translated_total += 1
                    logger.info("Переведено: %s (%d шагов)", row.name, len(steps_ru))

                await session.commit()
                processed_total += len(rows)
                print(f"💾 Батч из {len(rows)} упражнений обработан")

    await engine.dispose()
    print(
        f"\n✅ Переведено: {translated_total}, "
        f"пропущено: {skipped_total}, "
        f"обработано записей: {processed_total}",
    )


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Перевод technique_steps → technique_steps_ru через Claude API",
    )
    parser.add_argument(
        "--api-key",
        default=None,
        help="Anthropic API ключ (или переменная ANTHROPIC_API_KEY в backend/.env)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        metavar="N",
        help="Обработать не более N упражнений",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> None:
    """Точка входа ``python -m seeds.translate_technique_steps``."""
    logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(name)s | %(message)s")
    args = _parse_args(argv)
    try:
        api_key = _load_api_key(args.api_key)
    except RuntimeError as exc:
        print(str(exc), file=sys.stderr)
        sys.exit(1)
    asyncio.run(run_translate(api_key=api_key, limit=args.limit))


if __name__ == "__main__":
    main()
