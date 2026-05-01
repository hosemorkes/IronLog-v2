# IronLog

Тренировочный трекер: библиотека упражнений, планы тренировок (шаблоны), журнал выполнения (сессии и подходы), личные рекорды, фоновая обработка через Dramatiq, проверка достижений после завершения сессии и WebSocket-уведомления.

---

## Быстрый старт

```bash
# 1. Клонировать репозиторий
git clone <repo-url> ironlog
cd ironlog

# 2. Переменные окружения
cp .env.example .env
# Пароли и параметры для Postgres / Redis / RabbitMQ / MinIO в корневом .env (см. комментарии в файле).

cp backend/.env.example backend/.env
# Минимум для API: SECRET_KEY (JWT); в docker-compose URL БД, Redis, RabbitMQ и MinIO подставляются в environment сервиса api.

# Фронт вне Docker (локальная разработка):
cp web/.env.local.example web/.env.local
# Минимум:
#   NEXT_PUBLIC_API_URL=http://localhost:8000
# Опционально (иначе WS-URL выводится из API):
#   NEXT_PUBLIC_WS_URL=ws://localhost:8000

# 3. Запустить основные сервисы (сеть Docker: ironlog)
docker-compose up -d

# 4. Миграции БД
docker-compose exec api alembic upgrade head

# 5. Сиды — наполнить БД упражнениями и ачивками (один раз)
docker-compose exec api python -m seeds.exercises
docker-compose exec api python -m seeds.achievements

# 6. Открыть приложение
# Дашборд — http://localhost:3000/dashboard
# Упражнения — http://localhost:3000/exercises
# Планы — http://localhost:3000/workouts (новый: /workouts/new; карточка: /workouts/<id>; редактирование: /workouts/<id>/edit)
# Прогресс — http://localhost:3000/progress
# Профиль — http://localhost:3000/profile
# История тренировок — http://localhost:3000/history
# Активная тренировка по плану (JWT) — http://localhost:3000/session/<plan_id>
#   (при открытии создаётся сессия POST /api/user/sessions; итоги — /session/<plan_id>/complete?sessionId=…)
```

Для UI с защищёнными эндпоинтами после логина сохраните access-токен в браузере:  
`localStorage.setItem("ironlog_access_token", "<jwt>")`. Без токена каталог упражнений доступен публично; планы, сессии и прогресс отвечают **401**.

---

## Docker-образы (production-слой)

| Сервис | Файл | Заметки |
|--------|------|---------|
| **api** | `backend/Dockerfile` | Multi-stage (wheels → runtime), Python **3.11-slim**, non-root `appuser`, **HEALTHCHECK** на `GET /health`. Сборка **`APP_ENV`**: в `docker-compose` для **api** задано `development` (uvicorn **--reload** и монтирование `./backend:/app`); для **worker** — `production`. Для продакшена API соберите с `APP_ENV=production`. |
| **worker** | тот же образ | Команда `dramatiq ...`; **healthcheck** в compose отключён (порт 8000 не слушается). |
| **web** | `web/Dockerfile` | Multi-stage **deps → builder → runner**, Next.js **`output: "standalone"`**, Node **20**, пользователь **nextjs**, **`node server.js`**. На этапе **build** задаются **`NEXT_PUBLIC_API_URL`** и **`NEXT_PUBLIC_WS_URL`** (в compose сейчас `localhost` для доступа из браузера хоста). Локальная разработка UI: **`cd web && npm run dev`** — без Docker. |

Мониторинг: `docker-compose --profile monitoring up -d`.

---

## Адреса сервисов

| Сервис | URL |
|--------|-----|
| Web App (PWA) | http://localhost:3000 |
| Дашборд | http://localhost:3000/dashboard |
| Упражнения | http://localhost:3000/exercises |
| Планы (список, карточка) | http://localhost:3000/workouts , `/workouts/[id]` |
| Конструктор / редактирование плана | `/workouts/new` , `/workouts/[id]/edit` (свои планы; назначенные тренером не редактируются) |
| Прогресс | http://localhost:3000/progress |
| Профиль | http://localhost:3000/profile |
| История тренировок | http://localhost:3000/history |
| Активная тренировка | http://localhost:3000/session/[plan_id] (`plan_id` из карточки плана; не UUID сессии) |
| Итоги тренировки | `/session/[plan_id]/complete?sessionId=…` (редирект после завершения) |
| Admin Panel | http://localhost:3002 |
| API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |
| Проверка API | http://localhost:8000/health |

Мониторинг:

| Сервис | URL |
|--------|-----|
| pgAdmin | http://localhost:5050 |
| Redis Commander | http://localhost:8081 |
| RabbitMQ UI | http://localhost:15672 |
| Flower | http://localhost:5555 |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3003 |

---

## API (кратко)

Префикс **`/api`** задаётся приложением; актуальные пути — в Swagger.

| Область | Примеры |
|---------|---------|
| Аутентификация | `GET /api/auth/me` (текущий пользователь по JWT) |
| Справочник | `GET /api/exercises`, `GET /api/exercises/{id}` |
| Планы пользователя | `GET/POST /api/user/plans`, `GET/PUT/DELETE /api/user/plans/{id}`, `POST .../duplicate` |
| Журнал тренировок | `POST /api/user/sessions`, `GET /api/user/sessions`, `GET/PUT /api/user/sessions/{id}`, `POST .../sets` |
| Прогресс и дашборд | `GET /api/user/progress`, `GET /api/user/progress/weekly` (календарная неделя Пн–Вс), `GET /api/user/progress/recent-prs`, `GET /api/user/sessions`, `GET /api/user/achievements` |

После **`PUT`** завершения сессии API ставит в очередь Dramatiq задачи **`check_achievements`** и **`update_stats`**.  
**`check_achievements`** в воркере вызывает **`services/achievement_service.check_achievements_after_workout`**: идемпотентная выдача ачивок и событие WebSocket **`achievements.unlocked`** на канал **`/ws/{user_id}`** (см. `backend/main.py`, `backend/websocket/manager.py`).

---

## Локальная разработка без Docker

| Компонент | Команда |
|-----------|---------|
| Web (Next.js 14) | `cd web && npm install && npm run dev` — порт **3000** |
| API | `cd backend` — см. **`docs/VENV_SETUP.md`**, `uvicorn main:app --reload` при настроенном **`backend/.venv`** и Postgres |

---

## Документация

| Файл / раздел | Описание |
|---------------|----------|
| `docs/PRODUCT_NOTES.md` | Продуктовые заметки, каталог упражнений, ачивки |
| `docs/README.md` | Оглавление `docs/` |
| `ROADMAP.md` | Дорожная карта |
| `docs/ARCHITECTURE.md` | Архитектура, API, данные |
| `docs/PROJECT_STRUCTURE.md` | Структура репозитория |
| `docs/MICROSERVICES.md` | Сервисы в docker-compose |
| `CURSOR_PROMPTS.md` | Промпты для Cursor |
| `.cursor/agents/` | Подсказки для агентов (backend, frontend, devops и др.) |
| `CLAUDE.md` | Контекст для Claude/Cursor |
| `.cursorrules` | Правила кода |
| `docs/VENV_SETUP.md` | Локальный Python (`backend/.venv`) |

---

## Стек

**Backend:** Python 3.11 · FastAPI · PostgreSQL 15 · Redis · RabbitMQ · MinIO · Dramatiq · SQLAlchemy 2 async · Alembic

**Frontend:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · TanStack Query · Zustand

**Infra:** Docker Compose (сеть **ironlog**) · multi-stage Dockerfile (api, web) · (опционально) Prometheus · Grafana

---

## Полезные команды

```bash
# Логи API
docker-compose logs -f api

# Логи воркера (Dramatiq)
docker-compose logs -f worker

# PostgreSQL в контейнере
docker-compose exec postgres psql -U ironlog -d ironlog

# Миграции (после изменений моделей — только через Alembic)
docker-compose exec api alembic revision --autogenerate -m "add_table"
docker-compose exec api alembic upgrade head

# Тесты backend в контейнере
docker-compose exec api pytest

# Тесты backend локально (интерпретатор только из backend/.venv, см. docs/VENV_SETUP.md)
# Windows:  cd backend && .venv\Scripts\python -m pytest
# Unix:     cd backend && .venv/bin/python -m pytest

# Пересборка API без остальных сервисов
docker-compose up -d --no-deps --build api

# Пересборка web (после смены NEXT_PUBLIC_* задайте build.args или пересоберите с нужными переменными)
docker-compose up -d --no-deps --build web

docker-compose down

# Остановить и удалить volumes (данные БД и т.д.)
docker-compose down -v
```

---

## На VPS нужно сделать вручную только три вещи — один раз при первом деплое:

```bash
git clone github.com/hosemorkes/IronLog
cd IronLog

# 1. Создать .env файлы
cp .env.example .env
cp backend/.env.example backend/.env
# Отредактировать пароли (особенно SECRET_KEY)

# 2. Поднять контейнеры
docker compose up -d postgres redis rabbitmq minio api web

# 3. Применить миграции
docker exec -it ironlog_api bash
alembic upgrade head
```