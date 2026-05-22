"""Добавляет instructions_ru в backend/seeds/exercises_translated.json."""

from __future__ import annotations

import argparse
import json
import logging
import sys
import time
from pathlib import Path
from typing import Any

from deep_translator import GoogleTranslator

logger = logging.getLogger(__name__)

DEFAULT_JSON = Path(__file__).resolve().parent / "exercises_translated.json"
CHECKPOINT_EVERY = 25
REQUEST_DELAY_SEC = 0.05


def _load_exercises(path: Path) -> list[dict[str, Any]]:
    with path.open(encoding="utf-8") as fh:
        data = json.load(fh)
    if not isinstance(data, list):
        msg = f"Ожидался JSON-массив в {path}"
        raise ValueError(msg)
    return data


def _save_exercises(path: Path, data: list[dict[str, Any]]) -> None:
    with path.open("w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=2)
        fh.write("\n")


def _translate_text(translator: GoogleTranslator, text: str, *, retries: int = 3) -> str:
    last_error: Exception | None = None
    for attempt in range(retries):
        try:
            translated = translator.translate(text)
            if not translated:
                msg = "Пустой перевод"
                raise ValueError(msg)
            return translated.strip()
        except Exception as exc:  # noqa: BLE001 — внешний сервис
            last_error = exc
            wait = 1.5 * (attempt + 1)
            logger.warning("Ошибка перевода (попытка %d/%d): %s", attempt + 1, retries, exc)
            time.sleep(wait)
    assert last_error is not None
    raise last_error


def _translate_instructions(
    translator: GoogleTranslator,
    instructions: list[str],
) -> list[str]:
    if len(instructions) == 1:
        return [_translate_text(translator, instructions[0])]
    try:
        batch = translator.translate_batch(instructions)
        if isinstance(batch, list) and len(batch) == len(instructions):
            return [str(item).strip() for item in batch]
    except Exception as exc:  # noqa: BLE001 — fallback на поштучный перевод
        logger.warning("Batch-перевод не удался, fallback: %s", exc)
    return [_translate_text(translator, step) for step in instructions]


def run_translate(
    *,
    json_path: Path,
    limit: int | None = None,
    force: bool = False,
) -> None:
    exercises = _load_exercises(json_path)
    translator = GoogleTranslator(source="en", target="ru")
    translated_count = 0
    skipped_count = 0

    for index, exercise in enumerate(exercises):
        if limit is not None and translated_count >= limit:
            break

        instructions = exercise.get("instructions")
        if not isinstance(instructions, list) or not instructions:
            skipped_count += 1
            continue

        if exercise.get("instructions_ru") and not force:
            skipped_count += 1
            continue

        exercise_name = exercise.get("name_ru") or exercise.get("name") or exercise.get("id", "?")
        logger.info(
            "[%d/%d] %s — %d шагов",
            index + 1,
            len(exercises),
            exercise_name,
            len(instructions),
        )

        exercise["instructions_ru"] = _translate_instructions(translator, instructions)
        translated_count += 1

        if translated_count % CHECKPOINT_EVERY == 0:
            _save_exercises(json_path, exercises)
            logger.info("Checkpoint: сохранено %d переводов", translated_count)
            time.sleep(0.5)

        time.sleep(REQUEST_DELAY_SEC)

    _save_exercises(json_path, exercises)
    print(f"Done: translated={translated_count}, skipped={skipped_count}")


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Перевод instructions → instructions_ru в exercises_translated.json",
    )
    parser.add_argument(
        "--file",
        type=Path,
        default=DEFAULT_JSON,
        help="Путь к JSON-файлу (по умолчанию seeds/exercises_translated.json)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        metavar="N",
        help="Перевести не более N упражнений",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Перезаписать уже существующие instructions_ru",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
    args = _parse_args(argv)
    try:
        run_translate(json_path=args.file, limit=args.limit, force=args.force)
    except Exception as exc:  # noqa: BLE001
        logger.exception("Сбой перевода: %s", exc)
        sys.exit(1)


if __name__ == "__main__":
    main()
