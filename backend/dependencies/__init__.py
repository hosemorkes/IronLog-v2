"""Общие Depends для FastAPI."""

from dependencies.auth import (
    get_current_user,
    get_current_user_optional,
    require_admin,
    require_trainer_or_admin,
)

__all__ = [
    "get_current_user",
    "get_current_user_optional",
    "require_admin",
    "require_trainer_or_admin",
]
