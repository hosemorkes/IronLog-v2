---
name: ironlog-docs-sync
description: >-
  Synchronizes IronLog documentation in docs/ and the repository README with
  the current codebase. Covers ARCHITECTURE, MICROSERVICES, PROJECT_STRUCTURE,
  WEB_ROUTES, PRODUCT_NOTES, VENV_SETUP, and docs index. Use when the user asks
  to update or audit docs, after features touching API, docker-compose, web
  routes, repo layout, deploy, or pytest setup.
disable-model-invocation: true
---

# IronLog — синхронизация документации

## Когда применять

После изменений в коде, которые влияют на контракт API, инфраструктуру, маршруты web, дерево репозитория, продуктовые сиды или локальный workflow тестов — либо по явной просьбе пользователя привести доки в порядок.

## Стартовая точка

Открой `docs/README.md` — таблица файлов и назначение каждого.

## Чеклист «изменение → файл»

| Затронуто | Обновить |
|-----------|----------|
| Эндпойнты, JWT, WebSocket, доменные сущности | `docs/ARCHITECTURE.md` |
| docker-compose, worker, RabbitMQ, Redis, MinIO, фоновые задачи, порты | `docs/MICROSERVICES.md` |
| Дерево `backend/`, `web/`, `admin/`, сиды, миграции | `docs/PROJECT_STRUCTURE.md` |
| Пути `web/app`, экраны, навигация, профиль/тема | `docs/WEB_ROUTES.md` |
| Продукт, каталог упражнений для сидов, ачивки | `docs/PRODUCT_NOTES.md` |
| Локальный pytest / venv | `docs/VENV_SETUP.md` |
| Запуск, деплой, важные env, onboarding | корневой `README.md` |
| Новый файл в `docs/` или крупный новый раздел | `docs/README.md` (индекс) |

## Как работать

1. Сверь док с кодом (роуты, `main.py`, `docker-compose.yml`, структура папок) — не копируй устаревшее.
2. Минимальный дифф: не переписывай док целиком без причины.
3. Не дублируй `CLAUDE.md` и `.cursor/rules/` — в доках фиксируй факты проекта и репозитория.
4. В ответе пользователю перечисли изменённые файлы и кратко что обновлено.

## Связь с субагентом

Тот же контур, что и **`/documentation`** в `.cursor/agents/documentation.md`. Скилл удобен для явного «включи эту процедуру» без отдельного Task-субагента.

## Как запускать этот скилл

1. Режим **Agent** (не Ask).
2. В поле ввода: **`@`** → раздел **Skills** (или «Скиллы») → выбери **`ironlog-docs-sync`**.
3. Допиши задачу, например: «синхронизируй WEB_ROUTES и README после добавления экрана X» или «пройди чеклист по текущему репо».
4. Альтернатива: без `@` написать *«Примени скилл ironlog-docs-sync: …»* — агент подхватит скилл по имени/description, если контекст позволяет.

У скилла стоит `disable-model-invocation: true` — он **не подмешивается сам**; его нужно вызывать через `@` или явную просьбу.
