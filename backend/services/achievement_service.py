"""Проверка и выдача достижений после завершённой тренировки."""

from __future__ import annotations

import logging
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from models.achievement import Achievement, UserAchievement
from models.personal_record import PersonalRecord
from models.workout_session import WorkoutSession, WorkoutSet
from websocket.manager import websocket_manager

logger = logging.getLogger(__name__)

WS_EVENT_ACHIEVEMENTS_UNLOCKED = "achievements.unlocked"

# Коды достижений из справочника `achievements` (должны совпадать с сидом/миграциями).
CODE_FIRST_WORKOUT = "FIRST_WORKOUT"
CODE_STREAK_3 = "STREAK_3"
CODE_STREAK_7 = "STREAK_7"
CODE_FIRST_PR = "FIRST_PR"
CODE_PR_10 = "PR_10"
CODE_EXERCISES_10 = "EXERCISES_10"
CODE_WORKOUTS_10 = "WORKOUTS_10"
CODE_WORKOUTS_50 = "WORKOUTS_50"

# Пороги тоннажа (кг суммарно за всё время по завершённым сессиям).
_TONNAGE_BY_CODE: dict[str, float] = {
    "TONNAGE_BEAR": 200.0,
    "TONNAGE_HORSE": 500.0,
    "TONNAGE_CAR": 1_000.0,
    "TONNAGE_ELEPHANT": 5_000.0,
    "TONNAGE_TANK": 20_000.0,
    "TONNAGE_WHALE": 50_000.0,
    "TONNAGE_TRAIN": 100_000.0,
    "TONNAGE_BOEING": 400_000.0,
    "TONNAGE_FERRY": 1_000_000.0,
    "TONNAGE_ISS": 5_000_000.0,
}

_ALL_CODES: frozenset[str] = frozenset(
    {
        CODE_FIRST_WORKOUT,
        CODE_STREAK_3,
        CODE_STREAK_7,
        CODE_FIRST_PR,
        CODE_PR_10,
        CODE_EXERCISES_10,
        CODE_WORKOUTS_10,
        CODE_WORKOUTS_50,
        *_TONNAGE_BY_CODE.keys(),
    },
)


def _to_float_volume(v: Decimal | float | int | None) -> float:
    if v is None:
        return 0.0
    if isinstance(v, Decimal):
        return float(v)
    return float(v)


async def _load_completed_session_or_none(
    db: AsyncSession,
    user_id: UUID,
    session_id: UUID,
) -> WorkoutSession | None:
    result = await db.execute(
        select(WorkoutSession).where(
            WorkoutSession.id == session_id,
            WorkoutSession.user_id == user_id,
        ),
    )
    return result.scalar_one_or_none()


async def _load_achievement_by_code_map(
    db: AsyncSession,
) -> dict[str, Achievement]:
    result = await db.execute(select(Achievement).where(Achievement.code.in_(_ALL_CODES)))
    rows = result.scalars().all()
    return {a.code: a for a in rows}


async def _load_unlocked_codes(db: AsyncSession, user_id: UUID) -> set[str]:
    res = await db.execute(
        select(Achievement.code)
        .join(UserAchievement, UserAchievement.achievement_id == Achievement.id)
        .where(UserAchievement.user_id == user_id),
    )
    return {row[0] for row in res.all()}


async def _lifetime_volume_and_workout_count(
    db: AsyncSession,
    user_id: UUID,
) -> tuple[float, int]:
    row = await db.execute(
        select(
            func.coalesce(func.sum(WorkoutSession.total_volume_kg), 0),
            func.count(WorkoutSession.id),
        ).where(
            WorkoutSession.user_id == user_id,
            WorkoutSession.completed_at.is_not(None),
        ),
    )
    vol_raw, cnt_raw = row.one()
    return _to_float_volume(vol_raw), int(cnt_raw)


async def _count_personal_records(db: AsyncSession, user_id: UUID) -> int:
    raw = await db.scalar(
        select(func.count(PersonalRecord.id)).where(PersonalRecord.user_id == user_id),
    )
    return int(raw or 0)


async def _count_distinct_exercises_in_completed_sessions(
    db: AsyncSession,
    user_id: UUID,
) -> int:
    raw = await db.scalar(
        select(func.count(func.distinct(WorkoutSet.exercise_id)))
        .select_from(WorkoutSet)
        .join(WorkoutSession, WorkoutSet.session_id == WorkoutSession.id)
        .where(
            WorkoutSession.user_id == user_id,
            WorkoutSession.completed_at.is_not(None),
        ),
    )
    return int(raw or 0)


async def _workout_streak_days(db: AsyncSession, user_id: UUID) -> int:
    """Подряд дней с завершённой тренировкой (UTC, с одним днём «грейса» для вчера)."""
    today = datetime.now(timezone.utc).date()
    lookback_start = today - timedelta(days=400)
    day_rows = await db.execute(
        select(func.date_trunc("day", WorkoutSession.completed_at).label("d"))
        .where(
            WorkoutSession.user_id == user_id,
            WorkoutSession.completed_at.is_not(None),
            WorkoutSession.completed_at
            >= datetime.combine(lookback_start, datetime.min.time()).replace(tzinfo=timezone.utc),
        )
        .distinct(),
    )
    workout_days: set[date] = set()
    for (ts,) in day_rows.all():
        if ts is None:
            continue
        if isinstance(ts, datetime):
            workout_days.add(ts.date())
        elif isinstance(ts, date):
            workout_days.add(ts)

    def _day_has(d: date) -> bool:
        return d in workout_days

    streak = 0
    if _day_has(today):
        anchor: date | None = today
    elif _day_has(today - timedelta(days=1)):
        anchor = today - timedelta(days=1)
    else:
        anchor = None
    while anchor is not None and _day_has(anchor):
        streak += 1
        anchor -= timedelta(days=1)
    return streak


async def check_achievements_after_workout(
    user_id: UUID,
    session_id: UUID,
    db: AsyncSession,
) -> None:
    """
    Идемпотентная проверка условий ачивок после завершения тренировки.

    Повторный вызов с тем же состоянием БД не создаёт дубликатов благодаря
    проверке уже выданных кодов и ограничению ``uq_user_achievement_pair``.

    Args:
        user_id: Владелец сессии.
        session_id: Завершённая тренировка (триггер проверки).
        db: Асинхронная сессия SQLAlchemy.
    """
    session_row = await _load_completed_session_or_none(db, user_id, session_id)
    if session_row is None:
        logger.warning(
            "Пропуск проверки ачивок: сессия не найдена session_id=%s user_id=%s",
            session_id,
            user_id,
        )
        return
    if session_row.completed_at is None:
        logger.warning(
            "Пропуск проверки ачивок: сессия не завершена session_id=%s",
            session_id,
        )
        return

    ach_by_code = await _load_achievement_by_code_map(db)
    missing = _ALL_CODES - set(ach_by_code.keys())
    if missing:
        logger.warning(
            "В справочнике нет записей достижений для кодов: %s",
            ", ".join(sorted(missing)),
        )

    unlocked_codes = await _load_unlocked_codes(db, user_id)
    lifetime_kg, workout_count = await _lifetime_volume_and_workout_count(db, user_id)
    streak = await _workout_streak_days(db, user_id)
    pr_count = await _count_personal_records(db, user_id)
    distinct_exercises = await _count_distinct_exercises_in_completed_sessions(db, user_id)

    now = datetime.now(timezone.utc)
    newly_unlocked: list[Achievement] = []

    def _schedule_unlock(code: str, condition: bool) -> None:
        nonlocal newly_unlocked
        if not condition or code in unlocked_codes:
            return
        ach = ach_by_code.get(code)
        if ach is None:
            return
        db.add(
            UserAchievement(
                user_id=user_id,
                achievement_id=ach.id,
                unlocked_at=now,
            ),
        )
        unlocked_codes.add(code)
        newly_unlocked.append(ach)

    _schedule_unlock(CODE_FIRST_WORKOUT, workout_count >= 1)
    _schedule_unlock(CODE_STREAK_3, streak >= 3)
    _schedule_unlock(CODE_STREAK_7, streak >= 7)

    for code, need_kg in _TONNAGE_BY_CODE.items():
        _schedule_unlock(code, lifetime_kg >= need_kg)

    _schedule_unlock(CODE_FIRST_PR, pr_count >= 1)
    _schedule_unlock(CODE_PR_10, pr_count >= 10)

    _schedule_unlock(CODE_EXERCISES_10, distinct_exercises >= 10)
    _schedule_unlock(CODE_WORKOUTS_10, workout_count >= 10)
    _schedule_unlock(CODE_WORKOUTS_50, workout_count >= 50)

    if not newly_unlocked:
        return

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        logger.warning(
            "Конфликт при выдаче достижений (дубликат или гонка воркеров) user_id=%s session_id=%s",
            user_id,
            session_id,
        )
        return

    payload = {
        "event": WS_EVENT_ACHIEVEMENTS_UNLOCKED,
        "data": {
            "session_id": str(session_id),
            "achievements": [
                {
                    "achievement_id": str(a.id),
                    "code": a.code,
                    "name": a.name,
                    "icon": a.icon,
                }
                for a in newly_unlocked
            ],
        },
    }
    await websocket_manager.broadcast_json(user_id, payload)

    logger.info(
        "Выданы достижения user_id=%s session_id=%s codes=%s",
        user_id,
        session_id,
        [a.code for a in newly_unlocked],
    )
