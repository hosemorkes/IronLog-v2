"""Dramatiq: брокер RabbitMQ и регистрация акторов (импорт session_tasks для воркера)."""

from __future__ import annotations

import dramatiq
from dramatiq.brokers.rabbitmq import RabbitmqBroker
from dramatiq.brokers.stub import StubBroker

from core.config import get_settings


def _create_broker() -> dramatiq.Broker:
    """При отсутствии RABBITMQ_URL очередь в памяти (dev без воркера)."""
    settings = get_settings()
    raw = settings.rabbitmq_url
    if raw and raw.strip():
        return RabbitmqBroker(url=raw.strip())
    return StubBroker()


broker = _create_broker()
dramatiq.set_broker(broker)

# Регистрация декораторов @dramatiq.actor при старте воркера: dramatiq tasks
from . import session_tasks as session_tasks  # noqa: E402,F401
