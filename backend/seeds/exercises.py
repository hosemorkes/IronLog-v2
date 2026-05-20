"""Идемпотентное наполнение справочника упражнений (PRODUCT_NOTES §5)."""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

from sqlalchemy import select

from models.enums import ExerciseDifficulty
from models.exercise import Exercise
from seeds.db import make_engine, make_session_factory

logger = logging.getLogger(__name__)


@dataclass(frozen=True, slots=True)
class ExerciseSeed:
    """Данные одной строки сида (name = каноническое русское имя для дедупликации)."""

    name: str
    muscle_group: str
    secondary_muscles: list[str] | None
    equipment: str
    difficulty: ExerciseDifficulty
    description: str


# Каталог из docs/PRODUCT_NOTES.md — §5 «Каталог упражнений для сидов».
SEED_EXERCISES: tuple[ExerciseSeed, ...] = (
    # Базовые / многосуставные
    ExerciseSeed(
        "Жим штанги лёжа",
        "chest",
        ["shoulders", "arms"],
        "barbell",
        ExerciseDifficulty.intermediate,
        "Многосуставное движение на грудь на горизонтальной скамье.",
    ),
    ExerciseSeed(
        "Приседания со штангой",
        "legs",
        ["back", "core"],
        "barbell",
        ExerciseDifficulty.intermediate,
        "Классическое приседание со штангой на спине.",
    ),
    ExerciseSeed(
        "Становая тяга (классика)",
        "back",
        ["legs", "core"],
        "barbell",
        ExerciseDifficulty.advanced,
        "Классическая становая тяга узкой или средней постановкой стоп.",
    ),
    ExerciseSeed(
        "Становая тяга (сумо)",
        "legs",
        ["back", "core"],
        "barbell",
        ExerciseDifficulty.advanced,
        "Становая с широкой постановкой стоп и вертикальной голенью.",
    ),
    ExerciseSeed(
        "Подтягивание",
        "back",
        ["arms"],
        "bodyweight",
        ExerciseDifficulty.intermediate,
        "Вис на перекладине и подтягивание корпуса до касания перекладины.",
    ),
    ExerciseSeed(
        "Отжимание",
        "chest",
        ["shoulders", "arms", "core"],
        "bodyweight",
        ExerciseDifficulty.beginner,
        "Отжимания от пола с прямым телом.",
    ),
    ExerciseSeed(
        "Отжимание обратным хватом от лавки",
        "chest",
        ["back", "arms"],
        "bodyweight",
        ExerciseDifficulty.beginner,
        "Отжимания руками на скамье сзади — акцент на трицепс и переднюю дельту.",
    ),
    # Грудь
    ExerciseSeed(
        "Жим гантелей лёжа на лавке под углом 15°",
        "chest",
        ["shoulders", "arms"],
        "dumbbell",
        ExerciseDifficulty.intermediate,
        "Жим гантелей на наклонной скамье с небольшим углом.",
    ),
    ExerciseSeed(
        "Разводка гантелей лёжа",
        "chest",
        ["shoulders"],
        "dumbbell",
        ExerciseDifficulty.beginner,
        "Изоляция груди: разведение рук в стороны лёжа на скамье.",
    ),
    ExerciseSeed(
        "Сведение рук в кроссовере",
        "chest",
        ["shoulders"],
        "cable",
        ExerciseDifficulty.beginner,
        "Сведение рук по дугам вниз или вверх на блоках.",
    ),
    ExerciseSeed(
        "Жим в хаммере сидя на грудь",
        "chest",
        ["shoulders", "arms"],
        "machine",
        ExerciseDifficulty.beginner,
        "Жим от груди в рычажном тренажёге «хаммер».",
    ),
    ExerciseSeed(
        "Жим груди в тренажёре сидя",
        "chest",
        ["shoulders", "arms"],
        "machine",
        ExerciseDifficulty.beginner,
        "Жим в рычажном или винтовом грудном тренажёре в положении сидя.",
    ),
    # Плечи
    ExerciseSeed(
        "Жим гантелей сидя",
        "shoulders",
        ["arms", "chest"],
        "dumbbell",
        ExerciseDifficulty.intermediate,
        "Вертикальный жим из положения сидя со спинкой.",
    ),
    ExerciseSeed(
        "Разведение гантелей сидя",
        "shoulders",
        ["back"],
        "dumbbell",
        ExerciseDifficulty.beginner,
        "Махи в стороны в наклоне сидя — акцент на задние дельты.",
    ),
    ExerciseSeed(
        "Махи гантелей в стороны",
        "shoulders",
        [],
        "dumbbell",
        ExerciseDifficulty.beginner,
        "Разведение гантелей в стороны стоя или сидя — средние дельты.",
    ),
    ExerciseSeed(
        "Подъём гантелей на средние дельты",
        "shoulders",
        [],
        "dumbbell",
        ExerciseDifficulty.beginner,
        "Front / scaption-подъёмы с акцентом на средний пучок.",
    ),
    ExerciseSeed(
        "Разведение на задние дельты",
        "shoulders",
        ["back"],
        "dumbbell",
        ExerciseDifficulty.beginner,
        "Обратная машка или разведение в наклоне — задние дельты.",
    ),
    ExerciseSeed(
        "Тяга гантелей на задние дельты",
        "shoulders",
        ["back"],
        "dumbbell",
        ExerciseDifficulty.beginner,
        "Тяга к подбородку или к лицу с акцентом на задний пучок.",
    ),
    ExerciseSeed(
        "Подъём блина перед собой",
        "shoulders",
        ["core"],
        "barbell",
        ExerciseDifficulty.beginner,
        "Прямые подъёмы блина или короткой штанги перед собой.",
    ),
    ExerciseSeed(
        "Подъём гантелей перед собой",
        "shoulders",
        [],
        "dumbbell",
        ExerciseDifficulty.beginner,
        "Попеременные или одновременные подъёмы гантелей перед собой.",
    ),
    # Спина
    ExerciseSeed(
        "Тяга верхнего блока широким хватом",
        "back",
        ["arms"],
        "machine",
        ExerciseDifficulty.beginner,
        "Вертикальная тяга блока широким хватом к груди или за голову.",
    ),
    ExerciseSeed(
        "Вертикальная тяга в тренажёре широким хватом",
        "back",
        ["arms"],
        "machine",
        ExerciseDifficulty.beginner,
        "Тяга в магазинном тренажёре (аналог подтягивания).",
    ),
    ExerciseSeed(
        "Вертикальная тяга в кроссовере на одну руку",
        "back",
        ["arms"],
        "cable",
        ExerciseDifficulty.intermediate,
        "Односторонняя тяга верхнего блока — глубже растяжение широчайшего.",
    ),
    ExerciseSeed(
        "Горизонтальная тяга",
        "back",
        ["arms"],
        "machine",
        ExerciseDifficulty.beginner,
        "Тяга горизонтального блока или тренажёра к поясу.",
    ),
    ExerciseSeed(
        "Тяга гантелей к поясу в наклоне",
        "back",
        ["arms"],
        "dumbbell",
        ExerciseDifficulty.intermediate,
        "Наклон вперёд с упором ног, тяга гантелей к низу живота.",
    ),
    ExerciseSeed(
        "Тяга штанги в наклоне",
        "back",
        ["arms"],
        "barbell",
        ExerciseDifficulty.intermediate,
        "Сложное тягновое движение в наклоне прямой спиной.",
    ),
    ExerciseSeed(
        "Полувер",
        "back",
        ["arms"],
        "barbell",
        ExerciseDifficulty.intermediate,
        "Тяга штанги или EZ к поясу лёжа на скамье (грудь к опоре).",
    ),
    ExerciseSeed(
        "Полувер в кроссовере",
        "back",
        ["arms"],
        "cable",
        ExerciseDifficulty.intermediate,
        "Вариант полувера на блоках для постоянного натяжения.",
    ),
    ExerciseSeed(
        "Гиперэкстензия",
        "back",
        ["legs", "core"],
        "bodyweight",
        ExerciseDifficulty.beginner,
        "Разгибание корпуса в гиперэкстензоре или на скамье Гуро.",
    ),
    # Руки
    ExerciseSeed(
        "Французский жим",
        "arms",
        ["shoulders"],
        "barbell",
        ExerciseDifficulty.intermediate,
        "Разгибание на трицепс лёжа с узким хватом.",
    ),
    ExerciseSeed(
        "Разгибание рук в кроссовере",
        "arms",
        [],
        "cable",
        ExerciseDifficulty.beginner,
        "Разгибание на трицепс с канатом или прямой рукоятью.",
    ),
    ExerciseSeed(
        "Подъём штанги стоя на бицепс",
        "arms",
        [],
        "barbell",
        ExerciseDifficulty.intermediate,
        "Стоячий подъём штанги на бицепс прямым или EZ-грифом.",
    ),
    ExerciseSeed(
        "Подъём гантелей стоя на бицепс",
        "arms",
        [],
        "dumbbell",
        ExerciseDifficulty.beginner,
        "Базовый подъём гантелей на бицепс стоя или сидя.",
    ),
    # Ноги
    ExerciseSeed(
        "Жим ногами",
        "legs",
        ["core"],
        "machine",
        ExerciseDifficulty.beginner,
        "Жим платформы ногами в силовом тренажёре.",
    ),
    ExerciseSeed(
        "Приседания с гантелью (опора на пятку)",
        "legs",
        ["back", "core"],
        "dumbbell",
        ExerciseDifficulty.intermediate,
        "Гоблет или одна тяжёлая гантель у груди с акцентом на пятку.",
    ),
    ExerciseSeed(
        "Выпады с гантелями",
        "legs",
        ["core"],
        "dumbbell",
        ExerciseDifficulty.beginner,
        "Шаги с отведением колена назад или на месте с гантелями.",
    ),
    ExerciseSeed(
        "Сгибание ног лёжа",
        "legs",
        [],
        "machine",
        ExerciseDifficulty.beginner,
        "Изоляция задней поверхности бедра лёжа на скамье.",
    ),
    ExerciseSeed(
        "Разгибание ног сидя",
        "legs",
        [],
        "machine",
        ExerciseDifficulty.beginner,
        "Разгибание в коленном суставе в тренажёре сидя.",
    ),
    ExerciseSeed(
        "«Стульчик»",
        "legs",
        ["core"],
        "bodyweight",
        ExerciseDifficulty.intermediate,
        "Статическое приседание спиной к стене или зрительный «стена-присед».",
    ),
    # Пресс / кор
    ExerciseSeed(
        "Скручивание на пресс",
        "core",
        [],
        "bodyweight",
        ExerciseDifficulty.beginner,
        "Скручивание корпуса лёжа на спине или на скамье.",
    ),
    ExerciseSeed(
        "Пресс с мячом / блином сидя (повороты)",
        "core",
        ["back"],
        "dumbbell",
        ExerciseDifficulty.beginner,
        "Русские скручивания сидя с весом.",
    ),
    ExerciseSeed(
        "Планка",
        "core",
        ["back", "shoulders"],
        "bodyweight",
        ExerciseDifficulty.beginner,
        "Удержание прямой линии тела на предплечьях или руках.",
    ),
    ExerciseSeed(
        "Боковая планка",
        "core",
        ["back", "shoulders"],
        "bodyweight",
        ExerciseDifficulty.beginner,
        "Статика на боку на локте или руке.",
    ),
    # Разминка / кардио
    ExerciseSeed(
        "Велосипед",
        "cardio",
        [],
        "machine",
        ExerciseDifficulty.beginner,
        "Велоэргометр или велотренажёр для разминки и аэробной нагрузки.",
    ),
    ExerciseSeed(
        "Эллипсоид",
        "cardio",
        [],
        "machine",
        ExerciseDifficulty.beginner,
        "Эллиптический тренажёр с низкой ударной нагрузкой.",
    ),
    ExerciseSeed(
        "Беговая дорожка",
        "cardio",
        [],
        "machine",
        ExerciseDifficulty.beginner,
        "Ходьба или лёгкий бег для разминки.",
    ),
    ExerciseSeed(
        "Гребля",
        "cardio",
        ["back", "arms", "legs"],
        "machine",
        ExerciseDifficulty.beginner,
        "Гребной тренажёр — комплексное кардио.",
    ),
    ExerciseSeed(
        "Скакалка",
        "cardio",
        ["arms", "legs"],
        "bodyweight",
        ExerciseDifficulty.beginner,
        "Прыжки через скакалку для координации и пульса.",
    ),
    ExerciseSeed(
        "Плавание",
        "cardio",
        ["back", "shoulders"],
        "bodyweight",
        ExerciseDifficulty.beginner,
        "Любой стиль в бассейне для аэробной нагрузки.",
    ),
)


async def run() -> None:
    """Вставляет отсутствующие упражнения; повторный запуск идемпотентен по ``name``."""
    engine = make_engine()
    factory = make_session_factory(engine)
    names = [s.name for s in SEED_EXERCISES]
    async with factory() as session:
        res = await session.execute(select(Exercise.name).where(Exercise.name.in_(names)))
        existing: set[str] = set(res.scalars().all())
        added = 0
        for spec in SEED_EXERCISES:
            if spec.name in existing:
                continue
            secondaries = spec.secondary_muscles if spec.secondary_muscles else None
            session.add(
                Exercise(
                    name=spec.name,
                    name_ru=spec.name,
                    muscle_group=spec.muscle_group,
                    secondary_muscles=secondaries,
                    equipment=spec.equipment,
                    difficulty=spec.difficulty,
                    description=spec.description,
                    is_active=True,
                ),
            )
            added += 1
        await session.commit()
    await engine.dispose()
    logger.info("Упражнения: добавлено %s, уже в БД %s.", added, len(existing))


def main() -> None:
    """Точка входа для ``python -m seeds.exercises``."""
    logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(name)s | %(message)s")
    asyncio.run(run())


if __name__ == "__main__":
    main()
