"""Менеджер WebSocket-подключений: регистрация по user_id."""

from __future__ import annotations

import json
import logging
from collections import defaultdict
from typing import Any
from uuid import UUID

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class WebSocketConnectionManager:
    """Хранит активные WebSocket по идентификатору пользователя."""

    def __init__(self) -> None:
        self._by_user: dict[UUID, list[WebSocket]] = defaultdict(list)

    async def connect(self, websocket: WebSocket, user_id: UUID) -> None:
        """Принять соединение и зарегистрировать сокет для пользователя."""
        await websocket.accept()
        self._by_user[user_id].append(websocket)
        logger.debug("WebSocket подключён: user_id=%s", user_id)

    def disconnect(self, websocket: WebSocket, user_id: UUID) -> None:
        """Убрать сокет из реестра при отключении клиента."""
        connections = self._by_user.get(user_id)
        if not connections:
            return
        try:
            connections.remove(websocket)
        except ValueError:
            pass
        if not connections:
            del self._by_user[user_id]
        logger.debug("WebSocket отключён: user_id=%s", user_id)

    async def broadcast_json(self, user_id: UUID, message: dict[str, Any]) -> None:
        """Отправить JSON всем открытым соединениям пользователя (session / set / complete)."""
        connections = self._by_user.get(user_id)
        if not connections:
            return
        text = json.dumps(message, ensure_ascii=False, default=str)
        for websocket in list(connections):
            try:
                await websocket.send_text(text)
            except Exception as exc:  # noqa: BLE001 — отсоединённые клиенты
                logger.warning(
                    "Не удалось отправить WebSocket user_id=%s: %s",
                    user_id,
                    exc,
                )


websocket_manager = WebSocketConnectionManager()
