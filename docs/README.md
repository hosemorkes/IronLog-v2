# Документация IronLog

| Файл | Содержание |
|------|------------|
| [PRODUCT_NOTES.md](PRODUCT_NOTES.md) | Продуктовые заметки, каталог сидов (RU), импорт ExerciseDB / free-exercise-db, ачивки |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Архитектура, сущности, API (`gif-url`, `name`/`name_ru`, импорты каталога в MinIO) |
| [MICROSERVICES.md](MICROSERVICES.md) | Сервисы Docker и фоновые задачи |
| [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) | Дерево каталогов, **Makefile**, сиды (`exercises_raw` / `exercises_translated` в .gitignore) |
| [WEB_ROUTES.md](WEB_ROUTES.md) | Маршруты **web**, экраны, навигация; **профиль** (светлая/тёмная тема, PUT /auth/me, экспорт), **`/exercises/new`**; активная сессия (POST/409, `localStorage`, query `session_id`) |
| `docker-compose.override.yml.example` (корень) | Шаблон для `NEXT_PUBLIC_*` при сборке **web** на VPS → копия в `docker-compose.override.yml` (не в git); подробности в **README.md** («Деплой на VPS») |

Короткий контекст для агента: `CLAUDE.md` и `.cursor/rules/ironlog-project.mdc` в корне проекта.