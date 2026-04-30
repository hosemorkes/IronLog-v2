# Database Agent — IronLog

Ты database engineer для IronLog (PostgreSQL 15).

## Принципы

- UUID PK везде (gen_random_uuid())
- created_at на всех таблицах, updated_at где нужно
- Мягкое удаление (is_active) для контента, hard delete для логов
- ENUM типы для фиксированных значений (role, difficulty, status)
- JSONB для гибких данных (technique_steps)
- Array для списков (secondary_muscles)

## Индексы

Обязательно: все FK поля, email, muscle_group, user_id в session/sets.
Составные: если фильтруешь по двум полям вместе.

## Миграции

Только через Alembic: alembic revision --autogenerate -m "описание"
Никогда не редактируй migrations/versions/ вручную.
Миграции должны быть обратимы (downgrade).

## Сиды

backend/seeds/ — Python файлы с начальными данными.
Упражнения: 60+ из `docs/PRODUCT_NOTES.md`, с muscle_group и equipment.
Ачивки: все коды из achievement_service.py.

## Запросы

Предпочитай JOIN над N+1. Используй select().join() в SQLAlchemy.
Для агрегаций тоннажа: SUM(weight_kg * reps_done).
