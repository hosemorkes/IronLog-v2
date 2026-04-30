"""Точка входа FastAPI-приложения IronLog."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from fastapi import FastAPI, HTTPException, Request, WebSocket
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.websockets import WebSocketDisconnect

from core.config import get_settings
from database import connection_lifecycle
from routes import (
    admin,
    auth,
    exercises,
    trainer_manage,
    trainers,
    user_achievements,
    user_plans,
    user_progress,
    user_sessions,
)
from websocket.manager import websocket_manager

logger = logging.getLogger("ironlog.api")


def configure_logging(log_level: str) -> None:
    """Настраивает корневой логгер для консольного вывода."""
    level = getattr(logging, log_level.upper(), logging.INFO)
    if not logging.getLogger().handlers:
        logging.basicConfig(
            level=level,
            format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
    logging.getLogger().setLevel(level)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown через database.connection_lifecycle — БД, Redis, MinIO из env."""
    settings = get_settings()
    configure_logging(settings.log_level)
    logger.info("Старт IronLog API (environment=%s)", settings.environment)
    async with connection_lifecycle(settings, logger) as connections:
        app.state.connections = connections
        yield
    if hasattr(app.state, "connections"):
        delattr(app.state, "connections")
    logger.info("Остановка IronLog API завершена")


def create_app() -> FastAPI:
    """Фабрика приложения: CORS, роутеры, WebSocket, обработчики ошибок."""
    settings = get_settings()
    configure_logging(settings.log_level)

    application = FastAPI(
        title="IronLog API",
        description="Тренировочный трекер IronLog",
        version="0.1.0",
        lifespan=lifespan,
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    application.include_router(auth.router, prefix="/api/auth")
    application.include_router(exercises.router, prefix="/api/exercises")
    application.include_router(user_plans.router, prefix="/api/user/plans")
    application.include_router(user_sessions.router, prefix="/api/user/sessions")
    application.include_router(user_progress.router, prefix="/api/user/progress")
    application.include_router(user_achievements.router, prefix="/api/user/achievements")
    application.include_router(trainers.router, prefix="/api/trainers")
    application.include_router(trainer_manage.router, prefix="/api/trainer")
    application.include_router(admin.router, prefix="/api/admin")

    @application.get("/health")
    async def health() -> dict[str, Any]:
        """Проверка живости процесса API."""
        return {
            "status": "ok",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    @application.websocket("/ws/{user_id}")
    async def websocket_user(websocket: WebSocket, user_id: UUID) -> None:
        """Realtime-канал для пользователя (реализация в websocket/manager)."""
        await websocket_manager.connect(websocket, user_id)
        try:
            while True:
                await websocket.receive_text()
        except WebSocketDisconnect:
            pass
        finally:
            websocket_manager.disconnect(websocket, user_id)

    @application.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request,
        exc: RequestValidationError,
    ) -> JSONResponse:
        """Единый ответ при ошибке валидации тела/параметров."""
        _ = request
        return JSONResponse(
            status_code=422,
            content={
                "detail": exc.errors(),
                "message": "Ошибка валидации входных данных",
            },
        )

    @application.exception_handler(HTTPException)
    async def http_exception_handler(
        request: Request,
        exc: HTTPException,
    ) -> JSONResponse:
        """Предсказуемый JSON для HTTPException (detail на русском в роутерах)."""
        _ = request
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
        )

    @application.exception_handler(Exception)
    async def global_exception_handler(
        request: Request,
        exc: Exception,
    ) -> JSONResponse:
        """Логирование и маскировка необработанных ошибок (не HTTPException)."""
        logger.error(
            "Необработанное исключение: %s %s",
            request.method,
            request.url.path,
            exc_info=exc,
        )
        return JSONResponse(
            status_code=500,
            content={"detail": "Внутренняя ошибка сервера"},
        )

    return application


app = create_app()
