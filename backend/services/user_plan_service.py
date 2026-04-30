"""Бизнес-логика планов тренировок пользователя."""

from __future__ import annotations

import logging
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models.exercise import Exercise
from models.user import User
from models.workout_plan import PlanExercise, WorkoutPlan
from schemas.workout_plan import (
    PlanExerciseInput,
    PlanExerciseItemResponse,
    WorkoutPlanCreate,
    WorkoutPlanDetailResponse,
    WorkoutPlanListResponse,
    WorkoutPlanUpdate,
)
from services.exercise_service import exercise_to_detail_response

logger = logging.getLogger(__name__)

_PLAN_LOAD_OPTIONS = (
    selectinload(WorkoutPlan.exercises).selectinload(PlanExercise.exercise),
)


def _is_mutable_by_user(plan: WorkoutPlan) -> bool:
    """План создан самим пользователем (не назначен тренером)."""
    return plan.trainer_id is None


async def _load_visible_plan(
    db: AsyncSession,
    plan_id: UUID,
    user_id: UUID,
) -> WorkoutPlan:
    """Загружает активный план пользователя или 404."""
    result = await db.execute(
        select(WorkoutPlan)
        .where(
            WorkoutPlan.id == plan_id,
            WorkoutPlan.user_id == user_id,
            WorkoutPlan.is_active.is_(True),
        )
        .options(*_PLAN_LOAD_OPTIONS),
    )
    plan = result.scalar_one_or_none()
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="План не найден")
    return plan


async def _validate_exercise_refs(
    db: AsyncSession,
    exercise_inputs: list[PlanExerciseInput],
) -> None:
    """Проверяет наличие и активность упражнений из справочника."""
    if not exercise_inputs:
        return
    ids = list({item.exercise_id for item in exercise_inputs})
    result = await db.execute(select(Exercise).where(Exercise.id.in_(ids)))
    rows = {row.id: row for row in result.scalars().all()}
    missing = [str(i) for i in ids if i not in rows]
    if missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Неизвестные упражнения: {', '.join(missing)}",
        )
    inactive = [str(row.id) for row in rows.values() if not row.is_active]
    if inactive:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Упражнения недоступны (сняты с публикации): {', '.join(inactive)}",
        )


def _to_list_item(plan: WorkoutPlan) -> WorkoutPlanListResponse:
    """Преобразует ORM-план в ответ списка."""
    return WorkoutPlanListResponse(
        id=plan.id,
        name=plan.name,
        description=plan.description,
        difficulty=plan.difficulty,
        assigned_by_trainer=plan.trainer_id is not None,
        trainer_id=plan.trainer_id,
        exercise_count=len(plan.exercises),
        created_at=plan.created_at,
        updated_at=plan.updated_at,
    )


def _to_detail(plan: WorkoutPlan) -> WorkoutPlanDetailResponse:
    """Сборка детального ответа с сортировкой по order."""
    sorted_rows = sorted(plan.exercises, key=lambda pe: pe.order_num)
    items = [
        PlanExerciseItemResponse(
            id=pe.id,
            order=pe.order_num,
            sets=pe.sets,
            reps=pe.reps,
            weight_kg=pe.weight_kg,
            rest_seconds=pe.rest_seconds,
            exercise=exercise_to_detail_response(pe.exercise),
        )
        for pe in sorted_rows
    ]
    return WorkoutPlanDetailResponse(
        id=plan.id,
        name=plan.name,
        description=plan.description,
        difficulty=plan.difficulty,
        assigned_by_trainer=plan.trainer_id is not None,
        trainer_id=plan.trainer_id,
        exercises=items,
        created_at=plan.created_at,
        updated_at=plan.updated_at,
    )


async def create_user_plan(
    db: AsyncSession,
    user: User,
    payload: WorkoutPlanCreate,
) -> WorkoutPlanDetailResponse:
    """Создаёт план текущего пользователя (не тренерский шаблон)."""
    await _validate_exercise_refs(db, payload.exercises)

    plan = WorkoutPlan(
        user_id=user.id,
        trainer_id=None,
        name=payload.name,
        description=payload.description.strip() if payload.description else None,
        difficulty=payload.difficulty.strip() if payload.difficulty else None,
        is_template=False,
        is_active=True,
    )
    db.add(plan)
    await db.flush()

    for item in sorted(payload.exercises, key=lambda x: x.order):
        db.add(
            PlanExercise(
                plan_id=plan.id,
                exercise_id=item.exercise_id,
                order_num=item.order,
                sets=item.sets,
                reps=item.reps,
                weight_kg=item.weight_kg,
                rest_seconds=item.rest_seconds,
            )
        )

    await db.commit()

    reloaded = await _load_visible_plan(db, plan.id, user.id)
    logger.info("Создан план тренировки id=%s user_id=%s", plan.id, user.id)
    return _to_detail(reloaded)


async def list_user_plans(db: AsyncSession, user: User) -> list[WorkoutPlanListResponse]:
    """Планы пользователя: свои + назначенные тренером (активные)."""
    result = await db.execute(
        select(WorkoutPlan)
        .where(
            WorkoutPlan.user_id == user.id,
            WorkoutPlan.is_active.is_(True),
        )
        .options(selectinload(WorkoutPlan.exercises))
        .order_by(WorkoutPlan.updated_at.desc()),
    )
    plans = result.scalars().unique().all()
    return [_to_list_item(p) for p in plans]


async def get_user_plan_detail(
    db: AsyncSession,
    user: User,
    plan_id: UUID,
) -> WorkoutPlanDetailResponse:
    """Детали плана с упражнениями."""
    plan = await _load_visible_plan(db, plan_id, user.id)
    return _to_detail(plan)


async def update_user_plan(
    db: AsyncSession,
    user: User,
    plan_id: UUID,
    payload: WorkoutPlanUpdate,
) -> WorkoutPlanDetailResponse:
    """Обновляет только план без тренера (trainer_id IS NULL)."""
    plan = await _load_visible_plan(db, plan_id, user.id)
    if not _is_mutable_by_user(plan):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нельзя изменить план, назначенный тренером",
        )

    if payload.exercises is not None:
        await _validate_exercise_refs(db, payload.exercises)
        await db.execute(delete(PlanExercise).where(PlanExercise.plan_id == plan.id))
        for item in sorted(payload.exercises, key=lambda x: x.order):
            db.add(
                PlanExercise(
                    plan_id=plan.id,
                    exercise_id=item.exercise_id,
                    order_num=item.order,
                    sets=item.sets,
                    reps=item.reps,
                    weight_kg=item.weight_kg,
                    rest_seconds=item.rest_seconds,
                )
            )

    if payload.name is not None:
        plan.name = payload.name
    if payload.description is not None:
        plan.description = payload.description.strip() if payload.description else None
    if payload.difficulty is not None:
        plan.difficulty = payload.difficulty.strip() if payload.difficulty else None

    await db.commit()

    reloaded = await _load_visible_plan(db, plan.id, user.id)
    logger.info("Обновлён план id=%s user_id=%s", plan.id, user.id)
    return _to_detail(reloaded)


async def soft_delete_user_plan(
    db: AsyncSession,
    user: User,
    plan_id: UUID,
) -> None:
    """Мягкое удаление только своего пользовательского плана."""
    plan = await _load_visible_plan(db, plan_id, user.id)
    if not _is_mutable_by_user(plan):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нельзя удалить план, назначенный тренером",
        )

    plan.is_active = False
    await db.commit()
    logger.info("План удалён (soft) id=%s user_id=%s", plan.id, user.id)


async def duplicate_user_plan(
    db: AsyncSession,
    user: User,
    plan_id: UUID,
) -> WorkoutPlanDetailResponse:
    """Копирует любой доступный пользователю план как новый личный план."""
    plan = await _load_visible_plan(db, plan_id, user.id)
    sorted_rows = sorted(plan.exercises, key=lambda pe: pe.order_num)

    new_plan = WorkoutPlan(
        user_id=user.id,
        trainer_id=None,
        name=f"{plan.name} (копия)",
        description=plan.description,
        difficulty=plan.difficulty,
        is_template=False,
        is_active=True,
    )
    db.add(new_plan)
    await db.flush()

    for pe in sorted_rows:
        db.add(
            PlanExercise(
                plan_id=new_plan.id,
                exercise_id=pe.exercise_id,
                order_num=pe.order_num,
                sets=pe.sets,
                reps=pe.reps,
                weight_kg=pe.weight_kg,
                rest_seconds=pe.rest_seconds,
            )
        )

    await db.commit()
    reloaded = await _load_visible_plan(db, new_plan.id, user.id)
    logger.info("Создана копия плана source=%s new=%s user_id=%s", plan.id, new_plan.id, user.id)
    return _to_detail(reloaded)
