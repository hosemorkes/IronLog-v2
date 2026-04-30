"""Общие настройки pytest: .env до импорта `main` (там `app = create_app()` на уровне модуля)."""

from __future__ import annotations

import os
from pathlib import Path

import pytest
from dotenv import load_dotenv

_BACKEND_ROOT = Path(__file__).resolve().parent.parent
_REPO_ROOT = _BACKEND_ROOT.parent

_ENV_NAMES = (
    "DATABASE_URL",
    "REDIS_URL",
    "MINIO_ENDPOINT",
    "MINIO_ACCESS_KEY",
    "MINIO_SECRET_KEY",
    "SECRET_KEY",
)


def _load_backend_and_repo_dotenv() -> None:
    """Подхватывает переменные из backend/.env и при необходимости из корня репозитория."""
    load_dotenv(_BACKEND_ROOT / ".env")
    load_dotenv(_REPO_ROOT / ".env")


_load_backend_and_repo_dotenv()


def pytest_configure(config: pytest.Config) -> None:
    """Понятная подсказка, если после загрузки .env всё ещё не хватает ключей."""
    _ = config
    missing = [name for name in _ENV_NAMES if not os.environ.get(name)]
    if missing:
        pytest.exit(
            "Для тестов не заданы переменные окружения: "
            + ", ".join(missing)
            + ". Скопируйте backend/.env.example в backend/.env и подставьте значения "
            "(или задайте их в shell). См. docs/VENV_SETUP.md.",
            returncode=1,
        )
