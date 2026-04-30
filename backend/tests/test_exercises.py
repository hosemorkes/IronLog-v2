"""Интеграционные тесты HTTP-endpoints упражнений."""

from __future__ import annotations

import logging
from collections.abc import Callable, Coroutine
from typing import Any
from unittest.mock import AsyncMock, patch
from uuid import UUID, uuid4

import bcrypt
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from jose import jwt

from core.config import get_settings
from database.lifecycle import connection_lifecycle
from main import create_app
from models.enums import ExerciseDifficulty, UserRole
from models.exercise import Exercise
from models.user import User
from sqlalchemy import select

from services.exercise_service import invalidate_exercises_list_cache


@pytest_asyncio.fixture
async def app_connections():
    """Postgres / Redis / MinIO из .env через тот же жизненный цикл, что и API."""
    logger = logging.getLogger("ironlog.tests")
    settings = get_settings()
    async with connection_lifecycle(settings, logger) as connections:
        yield connections


@pytest_asyncio.fixture
async def async_client(app_connections):
    """httpx.AsyncClient против ASGI-приложения с подключениями без отдельного lifespan."""
    app = create_app()
    app.state.connections = app_connections
    transport = ASGITransport(app=app, raise_app_exceptions=True)
    async with AsyncClient(
        transport=transport,
        base_url="http://testserver",
        timeout=None,
    ) as client:
        yield client


def _jwt_for(user_id: UUID) -> str:
    """Bearer-токен с тем же `sub`, что ожидает decode в dependencies.auth."""
    s = get_settings()
    return jwt.encode(
        {"sub": str(user_id)},
        s.secret_key,
        algorithm=s.algorithm,
    )


@pytest.fixture
def create_test_user(
    app_connections,
) -> Callable[..., Coroutine[Any, Any, User]]:
    """Фабрика пользователей с валидным хешём пароля (для проверки JWT по id в БД)."""

    async def _create_user(*, role: UserRole = UserRole.user) -> User:
        session_factory = app_connections.session_factory
        uid = uuid4()
        salt = uuid4().hex[:8]
        email = f"test-{salt}-{role.value}@{uid.hex[:12]}.local"
        user = User(
            email=email,
            username=f"tester_{salt}_{role.value}",
            hashed_password=bcrypt.hashpw(b"test-password", bcrypt.gensalt()).decode(),
            role=role,
            is_active=True,
        )
        async with session_factory() as session:
            session.add(user)
            await session.commit()
            await session.refresh(user)
        return user

    return _create_user


@pytest.fixture
def create_test_trainer(
    create_test_user: Callable[..., Coroutine[Any, Any, User]],
) -> Callable[..., Coroutine[Any, Any, User]]:
    """Фабрика пользователя с ролью trainer."""

    async def _create_trainer() -> User:
        return await create_test_user(role=UserRole.trainer)

    return _create_trainer


@pytest.fixture
def create_test_exercise(
    app_connections,
    create_test_trainer: Callable[..., Coroutine[Any, Any, User]],
) -> Callable[..., Coroutine[Any, Any, Exercise]]:
    """Фабрика записей Exercise и снятие кеша Redis со списка."""

    redis = app_connections.redis
    session_factory = app_connections.session_factory

    async def _create_exercise(
        *,
        created_by_user: User | None = None,
        muscle_group: str = "Грудь",
        name: str = "Fixture Bench Press",
        name_ru: str = "Fixture Жим лёжа",
        equipment: str = "Штанга",
        difficulty: ExerciseDifficulty = ExerciseDifficulty.beginner,
    ) -> Exercise:
        creator = (
            await create_test_trainer() if created_by_user is None else created_by_user
        )
        ex = Exercise(
            name=name,
            name_ru=name_ru,
            muscle_group=muscle_group,
            equipment=equipment,
            difficulty=difficulty,
            description=None,
            created_by=creator.id,
            is_active=True,
        )
        async with session_factory() as session:
            session.add(ex)
            await session.commit()
            await session.refresh(ex)
        await invalidate_exercises_list_cache(redis)
        return ex

    return _create_exercise


@pytest.mark.asyncio
async def test_get_exercises_public(async_client: AsyncClient) -> None:
    """Неавторизованный клиент может прочитать каталог упражнений."""
    response = await async_client.get("/api/exercises")
    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload, list)


@pytest.mark.asyncio
async def test_get_exercises_filter_by_muscle(
    async_client: AsyncClient,
    create_test_exercise: Callable[..., Coroutine[Any, Any, Exercise]],
) -> None:
    """Фильтр muscle_group оставляет только упражнения с указанной группой."""
    unique = f"Спина_fixture_{uuid4().hex[:8]}"
    created = await create_test_exercise(
        muscle_group=unique,
        name="Row fixture",
        name_ru="Тяга тестовая",
        equipment="Тренажёр",
    )

    filtered = await async_client.get(
        "/api/exercises",
        params={"muscle_group": unique, "limit": 50},
    )
    assert filtered.status_code == 200
    rows = filtered.json()
    ids = [UUID(r["id"]) for r in rows]
    assert created.id in ids
    assert all(r["muscle_group"] == unique for r in rows)

    filtered_empty = await async_client.get(
        "/api/exercises",
        params={"muscle_group": f"_no_match_{uuid4().hex}", "limit": 50},
    )
    assert filtered_empty.status_code == 200
    assert filtered_empty.json() == []


@pytest.mark.asyncio
async def test_get_exercise_detail(
    async_client: AsyncClient,
    create_test_exercise: Callable[..., Coroutine[Any, Any, Exercise]],
) -> None:
    """GET по id возвращает детальную карточку."""
    created = await create_test_exercise(
        muscle_group="Ноги",
        name="Squat fixture",
        name_ru="Присед тест",
    )

    response = await async_client.get(f"/api/exercises/{created.id}")
    assert response.status_code == 200
    body = response.json()
    assert body["id"] == str(created.id)
    assert body["name"] == "Squat fixture"
    assert body["muscle_group"] == "Ноги"


@pytest.mark.asyncio
async def test_create_exercise_as_trainer(
    async_client: AsyncClient,
    create_test_trainer: Callable[..., Coroutine[Any, Any, User]],
) -> None:
    """Тренер может создать упражнение."""
    trainer = await create_test_trainer()
    token = _jwt_for(trainer.id)
    payload = {
        "name": "Custom Coach Move",
        "name_ru": "Авторское от тренера",
        "muscle_group": "Плечи",
        "equipment": "Гантели",
        "difficulty": "intermediate",
        "description": "Тест создания",
    }
    response = await async_client.post(
        "/api/exercises",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["name"] == payload["name"]
    assert body["created_by"] == str(trainer.id)


@pytest.mark.asyncio
async def test_create_exercise_as_user_forbidden(
    async_client: AsyncClient,
    create_test_user: Callable[..., Coroutine[Any, Any, User]],
) -> None:
    """Обычный user получает 403 при попытке создать упражнение."""
    user = await create_test_user(role=UserRole.user)
    token = _jwt_for(user.id)
    payload = {
        "name": "Illegal Create",
        "name_ru": "Недопустимо",
        "muscle_group": "Пресс",
        "equipment": "Своё тело",
        "difficulty": "beginner",
    }
    response = await async_client.post(
        "/api/exercises",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403
    assert "тренера" in response.json()["detail"].lower() or "администратора" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_search_exercises(
    async_client: AsyncClient,
    create_test_exercise: Callable[..., Coroutine[Any, Any, Exercise]],
    app_connections,
) -> None:
    """Параметр search находит по name / name_ru (ilike)."""
    redis = app_connections.redis
    marker = f"zebrauniq_{uuid4().hex}"
    noise = await create_test_exercise(
        muscle_group="Разминка/Кардио",
        name="Other cardio",
        name_ru="Другое кардио",
    )
    target = await create_test_exercise(
        muscle_group="Руки",
        name=f"Alpha {marker} curl",
        name_ru=f"Штанга альфа {marker}",
        equipment="Штанга",
    )
    await invalidate_exercises_list_cache(redis)

    response = await async_client.get("/api/exercises", params={"search": marker})
    assert response.status_code == 200
    items = response.json()
    ids = {UUID(it["id"]) for it in items}
    assert target.id in ids
    assert noise.id not in ids


@pytest.mark.asyncio
async def test_upload_exercise_image(
    async_client: AsyncClient,
    create_test_trainer: Callable[..., Coroutine[Any, Any, User]],
    create_test_exercise: Callable[..., Coroutine[Any, Any, Exercise]],
    app_connections,
) -> None:
    """Загрузка multipart-файла: MinIO через мок upload_exercise_image_object."""
    redis = app_connections.redis
    trainer = await create_test_trainer()
    exercise = await create_test_exercise(
        created_by_user=trainer,
        muscle_group="Спина",
        name="Cable row img",
        name_ru="Тяга на блоке",
        equipment="Кроссовер",
    )

    fake_url = f"http://minio-mocked/test/{uuid4().hex}.png"

    with patch(
        "services.storage_service.upload_exercise_image_object",
        new_callable=AsyncMock,
    ) as mock_upload:
        mock_upload.return_value = fake_url
        response = await async_client.post(
            f"/api/exercises/{exercise.id}/upload-image",
            headers={"Authorization": f"Bearer {_jwt_for(trainer.id)}"},
            files={
                "file": (
                    "pose.png",
                    b"\xff\xd8\xff\xe0fake-jpeg-placeholder",
                    "image/jpeg",
                ),
            },
        )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["image_url"] == fake_url
    mock_upload.assert_called_once()

    await invalidate_exercises_list_cache(redis)
    detail = await async_client.get(f"/api/exercises/{exercise.id}")
    assert detail.status_code == 200
    assert detail.json()["image_url"] == fake_url

    session_factory = app_connections.session_factory
    async with session_factory() as session:
        refreshed = (
            (
                await session.execute(
                    select(Exercise).where(Exercise.id == exercise.id),
                )
            )
            .scalars()
            .first()
        )
    assert refreshed is not None
    assert refreshed.image_url == fake_url
