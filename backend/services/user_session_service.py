"""Бизнес-логика тренировочных сессий: старт, подходы, завершение, PR, уведомления."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models.exercise import Exercise
from models.personal_record import PersonalRecord
from models.user import User
from models.workout_plan import PlanExercise, WorkoutPlan
from models.workout_session import WorkoutSession, WorkoutSet
from schemas.workout_session import (
    SessionExercisePreview,
    WorkoutSessionCompleteResponse,
    WorkoutSessionDetailResponse,
    WorkoutSessionHistoryResponse,
    WorkoutSessionListItem,
    WorkoutSessionStartBody,
    WorkoutSessionStartResponse,
    WorkoutSetItemResponse,
    WorkoutSetLogBody,
    WorkoutSetLogResponse,
)
from services.exercise_service import exercise_to_detail_response
from services import user_plan_service
from websocket.manager import websocket_manager

logger = logging.getLogger(__name__)

WS_EVENT_SESSION_STARTED = "session.started"
WS_EVENT_SET_LOGGED = "session.set_logged"
WS_EVENT_SESSION_COMPLETED = "session.completed"


def _volume_for_pr(weight_kg: Decimal | None, reps: int) -> Decimal:
    """Объём для сравнения PR: вес×повторы; без веса — повторы как скаляр (свой вес)."""
    r = Decimal(reps)
    if weight_kg is not None:
        return (weight_kg * r).quantize(Decimal("0.01"))
    return r


def _set_session_volume_contribution(weight_kg: Decimal | None, reps: int) -> Decimal:
    """Вклад подхода в суммарный объём: без веса считаем 0 (как в SUM(weight*reps))."""
    if weight_kg is None:
        return Decimal("0.00")
    return (weight_kg * Decimal(reps)).quantize(Decimal("0.01"))


async def _notify(user_id: UUID, event: str, data: dict) -> None:
    await websocket_manager.broadcast_json(user_id, {"event": event, "data": data})


def _enqueue_post_session_jobs(user_id: UUID, session_id: UUID) -> None:
    """Отправка Dramatiq-задач после фиксации завершения сессии в БД."""
    from tasks.session_tasks import check_achievements, update_stats

    uid = str(user_id)
    sid = str(session_id)
    check_achievements.send(uid, sid)
    update_stats.send(uid, sid)


async def _get_active_session_or_none(
    db: AsyncSession,
    user_id: UUID,
) -> WorkoutSession | None:
    result = await db.execute(
        select(WorkoutSession).where(
            WorkoutSession.user_id == user_id,
            WorkoutSession.completed_at.is_(None),
        ),
    )
    return result.scalar_one_or_none()


async def _load_session_owned(
    db: AsyncSession,
    session_id: UUID,
    user_id: UUID,
    *,
    with_sets: bool,
) -> WorkoutSession:
    if with_sets:
        load_options = (
            selectinload(WorkoutSession.sets).selectinload(WorkoutSet.exercise),
            selectinload(WorkoutSession.plan),
        )
        result = await db.execute(
            select(WorkoutSession)
            .where(
                WorkoutSession.id == session_id,
                WorkoutSession.user_id == user_id,
            )
            .options(*load_options),
        )
    else:
        result = await db.execute(
            select(WorkoutSession).where(
                WorkoutSession.id == session_id,
                WorkoutSession.user_id == user_id,
            ),
        )
    session = result.scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Тренировка не найдена")
    return session


async def _ensure_exercise_in_plan_if_any(
    db: AsyncSession,
    session: WorkoutSession,
    exercise_id: UUID,
) -> None:
    if session.plan_id is None:
        return
    res = await db.execute(
        select(PlanExercise.id).where(
            PlanExercise.plan_id == session.plan_id,
            PlanExercise.exercise_id == exercise_id,
        ),
    )
    if res.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Упражнение не входит в план этой тренировки",
        )


async def _ensure_exercise_active(db: AsyncSession, exercise_id: UUID) -> Exercise:
    exercise = await db.get(Exercise, exercise_id)
    if exercise is None or not exercise.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Упражнение не найдено или недоступно",
        )
    return exercise


async def _evaluate_and_maybe_update_pr(
    db: AsyncSession,
    user_id: UUID,
    exercise_id: UUID,
    weight_kg: Decimal | None,
    reps_done: int,
) -> bool:
    """Сравнивает объём подхода с личным рекордом (max volume_kg по упражнению)."""
    new_vol = _volume_for_pr(weight_kg, reps_done)

    raw_best = await db.scalar(
        select(func.max(PersonalRecord.volume_kg)).where(
            PersonalRecord.user_id == user_id,
            PersonalRecord.exercise_id == exercise_id,
        ),
    )
    prev_best = Decimal("0") if raw_best is None else Decimal(str(raw_best))

    if new_vol <= prev_best:
        return False

    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(PersonalRecord)
        .where(
            PersonalRecord.user_id == user_id,
            PersonalRecord.exercise_id == exercise_id,
        )
        .limit(1),
    )
    pr = result.scalar_one_or_none()
    if pr is None:
        db.add(
            PersonalRecord(
                user_id=user_id,
                exercise_id=exercise_id,
                weight_kg=weight_kg,
                reps=reps_done,
                volume_kg=new_vol,
                achieved_at=now,
            ),
        )
    else:
        pr.weight_kg = weight_kg
        pr.reps = reps_done
        pr.volume_kg = new_vol
        pr.achieved_at = now
    return True


async def start_session(
    db: AsyncSession,
    user: User,
    body: WorkoutSessionStartBody,
) -> WorkoutSessionStartResponse:
    """Начать тренировку; при наличии незавершённой — 409."""
    active = await _get_active_session_or_none(db, user.id)
    if active is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": "У вас уже есть активная тренировка. Завершите её перед новой.",
                "active_session_id": str(active.id),
            },
        )

    plan: WorkoutPlan | None = None
    plan_id = body.plan_id
    if plan_id is not None:
        plan = await user_plan_service._load_visible_plan(db, plan_id, user.id)

    started_at = datetime.now(timezone.utc)
    session = WorkoutSession(
        user_id=user.id,
        plan_id=plan_id,
        started_at=started_at,
        completed_at=None,
        notes=None,
        total_volume_kg=None,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)

    previews: list[SessionExercisePreview] = []
    if plan is not None:
        for pe in sorted(plan.exercises, key=lambda x: x.order_num):
            previews.append(
                SessionExercisePreview(
                    plan_exercise_id=pe.id,
                    order=pe.order_num,
                    exercise=exercise_to_detail_response(pe.exercise),
                    target_sets=pe.sets,
                    target_reps=pe.reps,
                    target_weight_kg=pe.weight_kg,
                    rest_seconds=pe.rest_seconds,
                ),
            )

    await _notify(
        user.id,
        WS_EVENT_SESSION_STARTED,
        {
            "session_id": str(session.id),
            "plan_id": str(session.plan_id) if session.plan_id else None,
            "started_at": session.started_at.isoformat(),
            "exercise_count": len(previews),
        },
    )

    logger.info(
        "Старт тренировки session_id=%s user_id=%s plan_id=%s",
        session.id,
        user.id,
        session.plan_id,
    )

    return WorkoutSessionStartResponse(
        session_id=session.id,
        plan_id=session.plan_id,
        started_at=session.started_at,
        exercises=previews,
    )


async def list_sessions(
    db: AsyncSession,
    user: User,
    *,
    limit: int,
    offset: int,
) -> WorkoutSessionHistoryResponse:
    """История и активные тренировки с пагинацией."""
    base = (
        select(WorkoutSession)
        .where(WorkoutSession.user_id == user.id)
        .order_by(WorkoutSession.started_at.desc())
    )
    count_result = await db.execute(
        select(func.count()).select_from(WorkoutSession).where(WorkoutSession.user_id == user.id),
    )
    total = int(count_result.scalar_one())

    page_result = await db.execute(base.offset(offset).limit(limit))
    sessions = page_result.scalars().all()

    items = [
        WorkoutSessionListItem(
            session_id=s.id,
            plan_id=s.plan_id,
            started_at=s.started_at,
            completed_at=s.completed_at,
            total_volume_kg=s.total_volume_kg,
        )
        for s in sessions
    ]
    return WorkoutSessionHistoryResponse(items=items, total=total)


async def get_session_detail(
    db: AsyncSession,
    user: User,
    session_id: UUID,
) -> WorkoutSessionDetailResponse:
    """Детали сессии с подходами и данными упражнений."""
    session = await _load_session_owned(db, session_id, user.id, with_sets=True)
    sorted_sets = sorted(
        session.sets,
        key=lambda s: (s.exercise_id, s.set_num, s.created_at),
    )
    set_items = [
        WorkoutSetItemResponse(
            id=ws.id,
            exercise_id=ws.exercise_id,
            exercise=exercise_to_detail_response(ws.exercise),
            set_num=ws.set_num,
            reps_done=ws.reps_done,
            weight_kg=ws.weight_kg,
            duration_seconds=ws.duration_seconds,
            is_pr=ws.is_pr,
        )
        for ws in sorted_sets
    ]

    return WorkoutSessionDetailResponse(
        session_id=session.id,
        plan_id=session.plan_id,
        started_at=session.started_at,
        completed_at=session.completed_at,
        total_volume_kg=session.total_volume_kg,
        notes=session.notes,
        sets=set_items,
    )


async def log_set(
    db: AsyncSession,
    user: User,
    session_id: UUID,
    body: WorkoutSetLogBody,
) -> WorkoutSetLogResponse:
    """Добавить подход и выставить is_pr при новом объёмном рекорде."""
    session = await _load_session_owned(db, session_id, user.id, with_sets=False)
    if session.completed_at is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нельзя добавлять подходы к завершённой тренировке",
        )

    exercise = await _ensure_exercise_active(db, body.exercise_id)
    await _ensure_exercise_in_plan_if_any(db, session, body.exercise_id)

    is_pr_flag = await _evaluate_and_maybe_update_pr(
        db,
        user.id,
        body.exercise_id,
        body.weight_kg,
        body.reps_done,
    )

    new_set = WorkoutSet(
        session_id=session.id,
        exercise_id=body.exercise_id,
        set_num=body.set_num,
        reps_done=body.reps_done,
        weight_kg=body.weight_kg,
        duration_seconds=body.duration_seconds,
        is_pr=is_pr_flag,
    )
    db.add(new_set)

    await db.commit()

    await _notify(
        user.id,
        WS_EVENT_SET_LOGGED,
        {
            "session_id": str(session.id),
            "set_id": str(new_set.id),
            "exercise_id": str(body.exercise_id),
            "set_num": body.set_num,
            "is_pr": is_pr_flag,
            "volume": float(_volume_for_pr(body.weight_kg, body.reps_done)),
        },
    )

    return WorkoutSetLogResponse(
        id=new_set.id,
        exercise_id=new_set.exercise_id,
        exercise=exercise_to_detail_response(exercise),
        session_id=session.id,
        set_num=new_set.set_num,
        reps_done=new_set.reps_done,
        weight_kg=new_set.weight_kg,
        duration_seconds=new_set.duration_seconds,
        is_pr=new_set.is_pr,
    )


async def complete_session(
    db: AsyncSession,
    user: User,
    session_id: UUID,
    completed_at: datetime | None,
) -> WorkoutSessionCompleteResponse:
    """Зафиксировать окончание, объём суммарного тоннажа и поставить задачи Dramatiq + WS."""
    session = await _load_session_owned(db, session_id, user.id, with_sets=True)
    if session.completed_at is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Тренировка уже завершена",
        )

    end_time = completed_at if completed_at is not None else datetime.now(timezone.utc)
    total = Decimal("0.00")
    for ws in session.sets:
        total += _set_session_volume_contribution(ws.weight_kg, ws.reps_done)

    session.completed_at = end_time
    session.total_volume_kg = total

    await db.commit()
    await db.refresh(session)

    _enqueue_post_session_jobs(user.id, session.id)

    await _notify(
        user.id,
        WS_EVENT_SESSION_COMPLETED,
        {
            "session_id": str(session.id),
            "completed_at": session.completed_at.isoformat() if session.completed_at else None,
            "total_volume_kg": str(session.total_volume_kg),
        },
    )

    logger.info(
        "Завершена тренировка session_id=%s user_id=%s volume=%s",
        session.id,
        user.id,
        session.total_volume_kg,
    )

    completed = session.completed_at
    assert completed is not None

    tv = session.total_volume_kg
    assert tv is not None

    return WorkoutSessionCompleteResponse(
        session_id=session.id,
        completed_at=completed,
        total_volume_kg=tv,
    )
