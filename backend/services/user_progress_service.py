"""Агрегаты прогресса для дашборда: тоннаж, неделя, серия, активная сессия, недавние PR."""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models.user import User
from models.workout_session import WorkoutSession, WorkoutSet
from schemas.user_progress import (
    RecentPrItemResponse,
    RecentPrListResponse,
    UserProgressResponse,
    WeeklyDayTonnage,
)

_WEEKDAY_RU_SHORT = ("Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс")


def _to_float(d: Decimal | None) -> float:
    if d is None:
        return 0.0
    return float(d)


def _volume_kg(weight_kg: Decimal | None, reps: int) -> Decimal:
    if weight_kg is None:
        return Decimal("0")
    return (weight_kg * Decimal(reps)).quantize(Decimal("0.01"))


async def _active_session_id(db: AsyncSession, user_id: UUID) -> UUID | None:
    res = await db.execute(
        select(WorkoutSession.id)
        .where(
            WorkoutSession.user_id == user_id,
            WorkoutSession.completed_at.is_(None),
        )
        .order_by(WorkoutSession.started_at.desc())
        .limit(1),
    )
    row = res.scalar_one_or_none()
    return row


async def get_user_progress(db: AsyncSession, user: User) -> UserProgressResponse:
    """Собрать сводку для дашборда (UTC-календарь)."""
    now = datetime.now(timezone.utc)
    today: date = now.date()

    # Всего завершённых тренировок и суммарный объём (NULL объёмы не входят в сумму)
    totals = await db.execute(
        select(
            func.count(WorkoutSession.id),
            func.coalesce(func.sum(WorkoutSession.total_volume_kg), 0),
        ).where(
            WorkoutSession.user_id == user.id,
            WorkoutSession.completed_at.is_not(None),
        ),
    )
    total_count_row = totals.one()
    workouts_completed_total = int(total_count_row[0])
    lifetime = _to_float(total_count_row[1] if isinstance(total_count_row[1], Decimal) else Decimal(str(total_count_row[1])))

    # Текущий месяц: [month_start, next_month)
    if today.month == 12:
        next_month_start = date(today.year + 1, 1, 1)
    else:
        next_month_start = date(today.year, today.month + 1, 1)

    month_start = today.replace(day=1)
    month_count = await db.scalar(
        select(func.count(WorkoutSession.id)).where(
            WorkoutSession.user_id == user.id,
            WorkoutSession.completed_at.is_not(None),
            WorkoutSession.completed_at >= datetime.combine(month_start, datetime.min.time()).replace(tzinfo=timezone.utc),
            WorkoutSession.completed_at < datetime.combine(next_month_start, datetime.min.time()).replace(
                tzinfo=timezone.utc,
            ),
        ),
    )
    workouts_this_month = int(month_count or 0)

    # Последние 7 календарных дней (включая сегодня), тоннаж по дате завершения сессии
    week_start = today - timedelta(days=6)
    daily_rows = await db.execute(
        select(
            func.date_trunc("day", WorkoutSession.completed_at).label("d"),
            func.coalesce(func.sum(WorkoutSession.total_volume_kg), 0),
        ).where(
            WorkoutSession.user_id == user.id,
            WorkoutSession.completed_at.is_not(None),
            WorkoutSession.completed_at
            >= datetime.combine(week_start, datetime.min.time()).replace(tzinfo=timezone.utc),
        ).group_by(func.date_trunc("day", WorkoutSession.completed_at)),
    )
    by_day: dict[date, float] = {}
    for row in daily_rows.all():
        raw_day, vol = row[0], row[1]
        if raw_day is None:
            continue
        d = raw_day.date() if isinstance(raw_day, datetime) else raw_day
        by_day[d] = _to_float(vol if isinstance(vol, Decimal) else Decimal(str(vol)))

    weekly: list[WeeklyDayTonnage] = []
    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        weekly.append(
            WeeklyDayTonnage(
                date=d,
                day_label=_WEEKDAY_RU_SHORT[d.weekday()],
                tonnage_kg=by_day.get(d, 0.0),
                is_today=d == today,
            ),
        )

    # Серия: подряд дней с тренировкой; если сегодня отдых — считаем с вчера (один «грейс»)
    streak_start_lookback = today - timedelta(days=400)
    distinct_days = await db.execute(
        select(func.date_trunc("day", WorkoutSession.completed_at).label("d")).where(
            WorkoutSession.user_id == user.id,
            WorkoutSession.completed_at.is_not(None),
            WorkoutSession.completed_at
            >= datetime.combine(streak_start_lookback, datetime.min.time()).replace(
                tzinfo=timezone.utc,
            ),
        ).distinct(),
    )
    workout_days: set[date] = set()
    for (ts,) in distinct_days.all():
        if ts is None:
            continue
        if isinstance(ts, datetime):
            workout_days.add(ts.date())
        elif isinstance(ts, date):
            workout_days.add(ts)

    def _day_has_workout(d: date) -> bool:
        return d in workout_days

    streak = 0
    anchor: date | None
    if _day_has_workout(today):
        anchor = today
    elif _day_has_workout(today - timedelta(days=1)):
        anchor = today - timedelta(days=1)
    else:
        anchor = None
    while anchor is not None and _day_has_workout(anchor):
        streak += 1
        anchor -= timedelta(days=1)

    active = await _active_session_id(db, user.id)

    return UserProgressResponse(
        total_lifetime_tonnage_kg=lifetime,
        weekly_tonnage_by_day=weekly,
        workout_streak_days=streak,
        workouts_completed_total=workouts_completed_total,
        workouts_completed_this_month=workouts_this_month,
        active_session_id=active,
    )


async def get_recent_prs(db: AsyncSession, user: User, *, limit: int = 3) -> RecentPrListResponse:
    """Последние подходы с флагом PR."""
    lim = max(1, min(limit, 20))
    result = await db.execute(
        select(WorkoutSet)
        .join(WorkoutSession)
        .where(
            WorkoutSession.user_id == user.id,
            WorkoutSet.is_pr.is_(True),
        )
        .options(selectinload(WorkoutSet.exercise))
        .order_by(WorkoutSet.created_at.desc())
        .limit(lim),
    )
    sets = result.scalars().all()
    items: list[RecentPrItemResponse] = []
    for ws in sets:
        ex = ws.exercise
        vol = _volume_kg(ws.weight_kg, ws.reps_done)
        items.append(
            RecentPrItemResponse(
                exercise_id=ws.exercise_id,
                exercise_name=ex.name_ru,
                set_num=ws.set_num,
                reps_done=ws.reps_done,
                weight_kg=float(ws.weight_kg) if ws.weight_kg is not None else None,
                volume_kg=float(vol),
                achieved_at=ws.created_at,
            ),
        )
    return RecentPrListResponse(items=items)
