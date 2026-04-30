"""Идемпотентное наполнение справочника achievements (PRODUCT_NOTES §8 и §10, коды из achievement_service)."""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from sqlalchemy import select

from models.achievement import Achievement
from seeds.db import make_engine, make_session_factory
from services.achievement_service import (
    _ALL_CODES,
    _TONNAGE_BY_CODE,
    CODE_EXERCISES_10,
    CODE_FIRST_PR,
    CODE_FIRST_WORKOUT,
    CODE_PR_10,
    CODE_STREAK_3,
    CODE_STREAK_7,
    CODE_WORKOUTS_10,
    CODE_WORKOUTS_50,
)

logger = logging.getLogger(__name__)

# Подписи к порогам тоннажа — docs/PRODUCT_NOTES.md §10.
_TONNAGE_OBJECT_LABEL_RU: dict[str, str] = {
    "TONNAGE_BEAR": "взрослый бурый медведь",
    "TONNAGE_HORSE": "лошадь",
    "TONNAGE_CAR": "малолитражка (Lada Granta)",
    "TONNAGE_ELEPHANT": "африканский слон",
    "TONNAGE_TANK": "танк Т-72",
    "TONNAGE_WHALE": "синий кит",
    "TONNAGE_TRAIN": "локомотив ЧС7",
    "TONNAGE_BOEING": "Боинг 747",
    "TONNAGE_FERRY": "паром",
    "TONNAGE_ISS": "МКС",
}

# Краткие заголовки для карточки ачивки (§8 для поведенческих, §10 для тоннажа).
_TONNAGE_SHORT_NAME_RU: dict[str, str] = {
    "TONNAGE_BEAR": "Тоннаж: бурый медведь",
    "TONNAGE_HORSE": "Тоннаж: лошадь",
    "TONNAGE_CAR": "Тоннаж: малолитражка",
    "TONNAGE_ELEPHANT": "Тоннаж: слон",
    "TONNAGE_TANK": "Тоннаж: танк",
    "TONNAGE_WHALE": "Тоннаж: кит",
    "TONNAGE_TRAIN": "Тоннаж: локомотив",
    "TONNAGE_BOEING": "Тоннаж: Boeing 747",
    "TONNAGE_FERRY": "Тоннаж: паром",
    "TONNAGE_ISS": "Тоннаж: МКС",
}


def _achievement_specs() -> list[tuple[str, str, str, str, dict[str, Any] | None]]:
    """Собирает определения для всех кодов из ``achievement_service._ALL_CODES``."""
    behavioral: list[tuple[str, str, str, str, dict[str, Any] | None]] = [
        (
            CODE_FIRST_WORKOUT,
            "Первый шаг",
            "Первая завершённая тренировка.",
            "completed_workouts",
            {"min": 1},
        ),
        (
            CODE_STREAK_3,
            "Три дня подряд",
            "Три календарных дня завершённых тренировок подряд (UTC, с учётом «грейса» в логике сервиса).",
            "streak_days",
            {"min": 3},
        ),
        (
            CODE_STREAK_7,
            "Неделя подряд",
            "Семь дней стрика по завершённым тренировкам.",
            "streak_days",
            {"min": 7},
        ),
        (
            CODE_FIRST_PR,
            "Новый PR",
            "Первый зафиксированный личный рекорд.",
            "pr_count",
            {"min": 1},
        ),
        (
            CODE_PR_10,
            "Машина роста",
            "Десять личных рекордов в истории.",
            "pr_count",
            {"min": 10},
        ),
        (
            CODE_EXERCISES_10,
            "Новичок",
            "Десять разных упражнений в завершённых тренировках.",
            "distinct_exercises",
            {"min": 10},
        ),
        (
            CODE_WORKOUTS_10,
            "Десятка",
            "Десять завершённых тренировок.",
            "completed_workouts",
            {"min": 10},
        ),
        (
            CODE_WORKOUTS_50,
            "Полсотни",
            "Пятьдесят завершённых тренировок.",
            "completed_workouts",
            {"min": 50},
        ),
    ]

    tonnage_rows: list[tuple[str, str, str, str, dict[str, Any] | None]] = []
    for code, kg in sorted(_TONNAGE_BY_CODE.items(), key=lambda x: x[1]):
        object_label = _TONNAGE_OBJECT_LABEL_RU[code]
        short = _TONNAGE_SHORT_NAME_RU[code]
        threshold_int = int(kg) if kg == int(kg) else kg
        description = (
            f"Суммарный тоннаж (вес × повторы) по всем завершённым тренировкам "
            f"не менее {threshold_int} кг. Ориентир из шкалы объектов: {object_label}."
        )
        tonnage_rows.append(
            (
                code,
                short,
                description,
                "lifetime_tonnage_kg",
                {"min_kg": float(kg)},
            ),
        )

    combined = behavioral + tonnage_rows
    codes_from_specs = {row[0] for row in combined}
    if codes_from_specs != set(_ALL_CODES):
        missing = sorted(_ALL_CODES - codes_from_specs)
        extra = sorted(codes_from_specs - _ALL_CODES)
        msg = (
            "Несовпадение кодов сида с achievement_service: "
            f"missing={missing}, extra={extra}"
        )
        raise RuntimeError(msg)
    return combined


async def run() -> None:
    """Вставляет отсутствующие достижения; идемпотентность по уникальному ``code``."""
    specs = _achievement_specs()
    codes = [s[0] for s in specs]
    engine = make_engine()
    factory = make_session_factory(engine)
    async with factory() as session:
        res = await session.execute(select(Achievement.code).where(Achievement.code.in_(codes)))
        existing: set[str] = set(res.scalars().all())
        added = 0
        for code, name, description, condition_type, condition_value in specs:
            if code in existing:
                continue
            session.add(
                Achievement(
                    code=code,
                    name=name,
                    description=description,
                    icon=None,
                    condition_type=condition_type,
                    condition_value=condition_value,
                ),
            )
            added += 1
        await session.commit()
    await engine.dispose()
    logger.info("Достижения: добавлено %s, уже в БД %s.", added, len(existing))


def main() -> None:
    """Точка входа для ``python -m seeds.achievements``."""
    logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(name)s | %(message)s")
    asyncio.run(run())


if __name__ == "__main__":
    main()
