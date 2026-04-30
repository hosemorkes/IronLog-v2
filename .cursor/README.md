# IronLog — конфигурация Cursor

Корневая папка настроек Cursor для репозитория. Ниже — где что лежит.

## Агенты

- **Каталог:** `.cursor/agents/`
- **Файлы:** `orchestrator.md`, `backend.md`, `frontend.md`, `database.md`, `devops.md`, `qa.md` — подключай в чате через `@` (например `@orchestrator`).
- **Описание ролей и workflow:** `CURSOR_AGENTS.md` в корне репозитория.

## Правила

- **Корень проекта:** `.cursorrules` — общие стандарты кода и стека.
- **Каталог:** `.cursor/rules/` — `ironlog-project.mdc` (всегда), `ironlog-backend.mdc`, `ironlog-frontend.mdc`, `ironlog-infra.mdc` по `globs`.
- **Контекст задач:** в `docs/` — `ARCHITECTURE.md`, `MICROSERVICES.md`, `PROJECT_STRUCTURE.md` (см. `ironlog-project.mdc`); `CLAUDE.md` — сценарии; `.cursorrules` — конвенции с примерами.
