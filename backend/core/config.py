"""Загрузка настроек IronLog из окружения."""

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Настройки приложения."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = Field(
        ...,
        alias="DATABASE_URL",
        description="Async SQLAlchemy URL (postgresql+asyncpg://…)",
    )
    redis_url: str = Field(..., alias="REDIS_URL")
    rabbitmq_url: str | None = Field(
        default=None,
        alias="RABBITMQ_URL",
        description="Очередь Dramatiq — подключение в воркере, в API только для логирования",
    )
    minio_endpoint: str = Field(..., alias="MINIO_ENDPOINT")
    minio_access_key: str = Field(..., alias="MINIO_ACCESS_KEY")
    minio_secret_key: str = Field(..., alias="MINIO_SECRET_KEY")
    minio_use_ssl: bool = Field(default=False, alias="MINIO_USE_SSL")
    minio_bucket_exercises: str = Field(
        default="ironlog-exercises",
        alias="MINIO_BUCKET_EXERCISES",
    )
    minio_public_base_url: str | None = Field(
        default=None,
        alias="MINIO_PUBLIC_BASE_URL",
        description="Базовый URL для ссылок на объекты MinIO (из браузера), без слэша на конце",
    )

    secret_key: str = Field(..., alias="SECRET_KEY")
    algorithm: str = Field(default="HS256", alias="ALGORITHM")
    allowed_origins: str = Field(
        default=(
            "http://localhost:3000,http://localhost:3002,"
            "http://127.0.0.1:3000,http://127.0.0.1:3002"
        ),
        alias="ALLOWED_ORIGINS",
    )

    environment: str = Field(default="development", alias="ENVIRONMENT")
    debug: bool = Field(default=False, alias="DEBUG")
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")

    @property
    def cors_origins(self) -> list[str]:
        """Список origins для CORS; dev-клиенты web (3000) и admin (3002) всегда в списке."""
        raw = self.allowed_origins.split(",") if self.allowed_origins else []
        stripped = [o.strip() for o in raw if o.strip()]
        defaults = [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:3002",
            "http://127.0.0.1:3002",
        ]
        merged = list(dict.fromkeys([*stripped, *defaults]))
        return merged


@lru_cache
def get_settings() -> Settings:
    """Кэшируемая фабрика настроек (один процесс uvicorn)."""
    return Settings()
