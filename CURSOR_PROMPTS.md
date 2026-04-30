# 🤖 IronLog — Промпты для Cursor

Готовые промпты для ускорения разработки. Копируй в Cursor Chat или используй как основу.

## Как читать метку «Агенты»

Перед каждым промптом указано, **достаточно ли одного чата** для **текста в этом же блоке** (до следующего заголовка `###`).

**Важно:** метка **не** означает «нужно вызвать второго агента с тем же промптом». Если в блоке только про код backend — второй промпт для devops **нет**, его не откуда взять: либо игнорируй упоминания других ролей, либо открой **другой** блок ниже / напиши свой запрос. Два слоя = обычно **два сообщения подряд** в одном чате или **два чата** с разными вставками.

| Метка | Смысл |
|--------|--------|
| **Один чат** | Одна сессия справится с текстом блока; вставляешь один промпт и отправляешь. |
| **Один чат (указать роль)** | В начале сообщения уточни роль или подключи rule: `backend` / `frontend` / `qa` / `devops` (см. `.cursor/agents/*.md`). |
| **Два шага** | Сначала выполни один блок (или промпт), потом второй — два сообщения, **два разных текста**. |
| **Несколько агентов** | Большая задача вне одного промпта: сначала декомпозиция (например оркестратор из `.cursor/agents/orchestrator.md`), потом отдельные запросы по слоям. |

Контекст **frontend**: в репозитории уже есть приложение **`web/`** (Next.js 14 App Router, TypeScript, Tailwind, React Query в `app/providers.tsx`, заглушка `app/(app)/layout.tsx` и `app/(app)/dashboard/page.tsx`, хелпер `lib/api.ts`). Промпты рассчитаны на **расширение** этого каркаса, а не создание `web/` с нуля.

Визуал для экранов: макеты `exercise_library_mockup.html` / `exercise_detail_mockup.html` **и** интерактивный прототип **`ironlog-prototype/project/IronLog.html`** (экраны handoff).

---

## 🏗️ Инфраструктура

### Проверить docker-compose и env для сервиса `api`

**Агенты:** **Один чат (devops).** Это **отдельный** промпт: вставляй его, когда нужна инфраструктура. **Не** жди от него правок `main.py` — для кода API используй блок ниже «Создать backend/main.py».

```
Проверь и при необходимости поправь инфраструктуру IronLog для сервиса api.

Контекст:
- Корневой docker-compose.yml уже описывает postgres, redis, rabbitmq, minio и сервис api.
- У api: env_file ./backend/.env и environment с DATABASE_URL, REDIS_URL, RABBITMQ_URL, MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY (хосты — имена сервисов compose: postgres, redis, rabbitmq, minio).
- api depends_on с healthcheck postgres/redis/rabbitmq; healthcheck api бьёт в GET /health.

Сделай:
1) Убедись, что шаблон backend/.env.example (или документация) перечисляет те же переменные, что ожидает код config (без секретов в git).
2) Пароли из root .env / backend/.env согласованы с подставляемыми в DATABASE_URL / REDIS_URL (в т.ч. redis с requirepass).
3) ALLOWED_ORIGINS при необходимости включает http://localhost:3000 (web) и другие клиенты из документации.
4) Не ломай dev volume ./backend:/app если он нужен для hot-reload.

Кратко опиши в ответе, что проверил и что изменил.
```

---

### Создать backend/main.py

**Агенты:** **Один чат (backend).** Про docker-compose **в этом блоке ничего не требуется** — строки подключения уже пробрасываются в контейнер `api` (см. compose). Если compose надо поправить — **отдельное сообщение** с промптом «Проверить docker-compose и env для сервиса api» выше.

```
Создай backend/main.py для FastAPI приложения IronLog.

Требования:
- FastAPI с lifespan (startup/shutdown)
- CORS из переменной ALLOWED_ORIGINS (включай origin фронта: http://localhost:3000 из web/)
- Подключить все роутеры из routes/ с префиксом /api
- WebSocket endpoint /ws/{user_id} через websocket/manager.py
- Endpoint GET /health возвращает {"status": "ok", "timestamp": now}
- Логирование через logging
- Обработчик глобальных исключений

Роутеры для подключения:
- auth.router — /api/auth
- exercises.router — /api/exercises
- user_plans.router — /api/user/plans
- user_sessions.router — /api/user/sessions
- user_progress.router — /api/user/progress
- user_achievements.router — /api/user/achievements
- trainers.router — /api/trainers
- trainer_manage.router — /api/trainer
- admin.router — /api/admin

Подключения к БД, Redis, MinIO (и при необходимости брокеру) инициализируй в lifespan через async context manager / существующий backend/core/config.py и database. URL читай из переменных окружения (DATABASE_URL, REDIS_URL, …) — они задаются для сервиса api в docker-compose, не хардкодь хосты и пароли в коде.
```

---

### Создать backend/models/ все модели

**Агенты:** **Несколько агентов** (database + backend) при первой большой схеме и согласовании с миграциями; **Один чат (backend)** если модели и Alembic делает один разработчик подряд.

```
Создай SQLAlchemy 2.x async модели для IronLog в папке backend/models/.

Таблицы и поля (все PK — UUID, все таблицы имеют created_at):

users: id, email, username, hashed_password, role (ENUM: user/trainer/admin),
       fitness_level, bio, avatar_url, is_trainer, specialization,
       certification_url, hourly_rate, experience_years, is_active, updated_at

exercises: id, name, name_ru, muscle_group, secondary_muscles (ARRAY),
           equipment, difficulty (ENUM: beginner/intermediate/advanced),
           description, technique_steps (JSONB), image_url, gif_url,
           created_by (FK→users), is_active

workout_plans: id, user_id (FK), trainer_id (FK nullable), name, description,
               difficulty, is_template, is_active, updated_at

plan_exercises: id, plan_id (FK), exercise_id (FK), order_num, sets, reps,
                weight_kg, rest_seconds, notes

workout_sessions: id, user_id (FK), plan_id (FK nullable), started_at,
                  completed_at (nullable), notes, total_volume_kg

workout_sets: id, session_id (FK), exercise_id (FK), set_num, reps_done,
              weight_kg, duration_seconds (nullable), is_pr (bool)

personal_records: id, user_id (FK), exercise_id (FK), weight_kg, reps,
                  volume_kg, achieved_at

trainer_client_connections: id, trainer_id (FK), client_id (FK),
                            status (ENUM: pending/accepted/rejected),
                            initiated_by (ENUM: trainer/client), updated_at

achievements: id, code (UNIQUE), name, description, icon, condition_type, condition_value

user_achievements: id, user_id (FK), achievement_id (FK), unlocked_at

Используй Base = DeclarativeBase(), все relationship с lazy="select".
Добавь индексы: email (users), muscle_group (exercises), user_id (sessions).
```

---

## 📚 Библиотека упражнений

### API для упражнений

**Агенты:** **Один чат (backend)**.

```
Создай backend/routes/exercises.py — роутер для упражнений IronLog.

Endpoints:
GET  /api/exercises
  - query params: muscle_group (str), equipment (str), difficulty (str), search (str), limit (int=20), offset (int=0)
  - ответ: список ExerciseListResponse (id, name, name_ru, muscle_group, equipment, difficulty, image_url, tags)
  - кешировать в Redis на 1 день (ключ: "cache:exercises:{hash(params)}")

GET  /api/exercises/{exercise_id}
  - ответ: ExerciseDetailResponse (все поля + technique_steps)
  - не требует авторизации (публичный endpoint)

POST /api/exercises
  - только TRAINER и ADMIN
  - принимает: ExerciseCreate (все поля)
  - image и gif — отдельный endpoint для загрузки

PUT  /api/exercises/{exercise_id}
  - только TRAINER (свои) и ADMIN (любые)

DELETE /api/exercises/{exercise_id}
  - только ADMIN, soft delete (is_active = False)

POST /api/exercises/{exercise_id}/upload-image
  - multipart/form-data, поле "file"
  - загружает в MinIO через storage_service
  - обновляет image_url в БД
  - только TRAINER/ADMIN

Используй Depends(get_db), Depends(get_current_user), Depends(require_trainer_or_admin).
```

### UI: страница библиотеки

**Агенты:** **Один чат (frontend)** при готовом API; **Два шага** (backend → frontend), если API ещё нет.

```
Доработай web/app/(app)/exercises/page.tsx — страница библиотеки упражнений (создай route при отсутствии).

Уже есть: web/ с Next.js 14 App Router, app/(app)/layout.tsx, lib/api.ts, TanStack Query в app/providers.tsx — используй их.

Дизайн:
- По макету exercise_library_mockup.html и по экрану «Упражнения» из ironlog-prototype/project/IronLog.html / ironlog-screens-a.jsx
- Заголовок в стиле прототипа («Упражнения», акцент #7c6ef2)
- Поиск с debounce 300ms
- Горизонтальные фильтр-чипы: Все / Грудь / Спина / Ноги / Плечи / Руки / Пресс / Кардио (согласуй с API и PRODUCT_NOTES)
- Секция «Популярные» (топ 3 по использованию) — если нет метрик API, заглушка с комментарием TODO
- Секция «Все упражнения» — бесконечная прокрутка (intersection observer)
- Карточка: миниатюра + название + теги мышц (синие #5ba3d9) + категория (акцент) + стрелка

Добавь хук useExercises(filters) в web/lib/hooks/useExercises.ts (React Query, базовый URL из lib/api.ts).
Тёмная тема как в globals.css / tailwind.config.ts; при необходимости светлая через CSS variables.
Анимация карточек: stagger ~50ms (animation-delay).
```

### UI: детальная карточка упражнения

**Агенты:** **Один чат (frontend)** при готовом GET /api/exercises/{id}; иначе **Два шага**.

```
Доработай web/app/(app)/exercises/[id]/page.tsx — детальная страница упражнения.

Уже есть каркас web/ — не дублируй провайдеры; страница внутри app/(app)/.

Дизайн:
- По exercise_detail_mockup.html и экрану карточки упражнения из ironlog-prototype (ScreenExerciseCard в ironlog-screens-a.jsx)
- Hero: SVG-фигура тела с подсветкой (компонент MuscleMap, аналог MuscleFigure в прототипе)
- «Назад» и «+ В тренировку»
- Название, теги (мышца, инвентарь, сложность)
- Три блока статистики: подходов / тренировок / тоннаж (данные с API или заглушки до эндпоинтов прогресса)
- Блок «Личный рекорд»: вес×повторы + дата + бейдж PR
- «Мышцы»: основные и вторичные
- «Техника»: нумерованные шаги с акцентными маркерами
- Sticky-кнопка «Добавить в тренировку»

MuscleMap: props primaryMuscles[], secondaryMuscles[].

Модал выбора плана или создания тренировки — когда будут готовы планы API.
```

---

## 🏋️ Конструктор тренировки

### API планов

**Агенты:** **Один чат (backend)**.

```
Создай backend/routes/user_plans.py — CRUD планов тренировок.

POST   /api/user/plans — создать план
  body: {name, description, difficulty, exercises: [{exercise_id, sets, reps, weight_kg, rest_seconds, order}]}

GET    /api/user/plans — список планов текущего пользователя
  включает планы пользователя + планы назначенные тренером

GET    /api/user/plans/{plan_id} — детали с exercise_id → данные упражнений

PUT    /api/user/plans/{plan_id} — обновить (только свои, не тренерские)

DELETE /api/user/plans/{plan_id} — soft delete (только свои)

POST   /api/user/plans/{plan_id}/duplicate — создать копию плана

Авторизация обязательна. User может управлять только своими планами.
```

---

## ⏱️ Режим выполнения

### API сессий

**Агенты:** **Один чат (backend)**; при нагрузке на WebSocket и Dramatiq — **Несколько агентов** (backend + devops для очередей).

```
Создай backend/routes/user_sessions.py — endpoints для активной тренировки.

POST /api/user/sessions — начать тренировку
  body: {plan_id? (если по плану)}
  возвращает: session_id + список упражнений

GET  /api/user/sessions — история тренировок с пагинацией

GET  /api/user/sessions/{session_id} — детали

POST /api/user/sessions/{session_id}/sets — залогировать подход
  body: {exercise_id, set_num, reps_done, weight_kg, duration_seconds?}
  автоматически проверяет PR: если вес*повторы > предыдущего рекорда → is_pr=True

PUT  /api/user/sessions/{session_id} — завершить тренировку
  {completed_at: now}
  → считает total_volume_kg = SUM(weight_kg * reps_done)
  → отправляет задачу в Dramatiq: check_achievements + update_stats

Все изменения транслируются через WebSocket к текущему пользователю.
```

### UI: активная тренировка

**Агенты:** **Два шага** (сессии API + компонент UI) или **Один чат (fullstack)**, если делаешь моки до готовности API.

```
Добавь web/components/workout/ActiveSession.tsx — режим выполнения тренировки.

Референс поведения и вёрстки: ScreenActiveWorkout в ironlog-prototype/project/ironlog-screens-b.jsx.

Функциональность:
- Текущее упражнение (изображение по URL с API при наличии)
- Поля Повторы / Вес кг на подход
- «Подход выполнен» → POST /api/user/sessions/{id}/sets
- После подхода — таймер отдыха (RestTimer), пропуск
- Переключение упражнений / шагов
- «Завершить тренировку» с подтверждением
- При is_pr — подсветка «Новый рекорд!»

Состояние: Zustand sessionStore (web/lib/store/ или согласованное место в проекте).
WebSocket — когда backend готов.

Страница-обёртка: например web/app/(app)/session/[id]/page.tsx — подключи компонент и загрузку данных через React Query.
```

---

## 📊 Дашборд

### UI: дашборд с тоннажем

**Агенты:** **Два шага** (прогресс/PR/ачивки API → UI) или **Один чат (frontend)** с мок-данными до API.

```
Замени заглушку в web/app/(app)/dashboard/page.tsx на полноценный дашборд.

Референс: ScreenDashboard в ironlog-prototype/project/ironlog-screens-a.jsx + шкала тоннажа из CLAUDE.md / docs/PRODUCT_NOTES.md.

Секции:
1. Приветствие с именем пользователя (из auth store / API)
2. TonnageWidget: общий тоннаж, «объект» шкалы, прогресс до следующего порога, таблица уровней
3. WeeklyChart: столбцы по дням (Recharts BarChart или CSS как в прототипе)
4. PRWidget: топ-3 последних рекорда
5. AchievementsWidget: последние разблокированные
6. CTA «Начать тренировку» — ссылка на конструктор / активную сессию

Данные: GET /api/user/progress, PR, achievements — когда доступны.
React Query: staleTime: 5 * 60 * 1000. Не дублируй Providers — используй существующий app/providers.tsx.
```

---

## 🏆 Достижения

### Логика ачивок

**Агенты:** **Один чат (backend)**.

```
Создай backend/services/achievement_service.py — сервис проверки достижений.

Функция: async def check_achievements_after_workout(user_id: UUID, session_id: UUID, db: AsyncSession)

Проверяет следующие ачивки (код → условие):

FIRST_WORKOUT          → первая завершённая тренировка
STREAK_3               → 3 тренировки подряд без пропуска
STREAK_7               → 7 тренировок подряд
TONNAGE_BEAR           → тоннаж ≥ 200 кг
TONNAGE_HORSE          → тоннаж ≥ 500 кг
TONNAGE_CAR            → тоннаж ≥ 1 000 кг
TONNAGE_ELEPHANT       → тоннаж ≥ 5 000 кг
TONNAGE_TANK           → тоннаж ≥ 20 000 кг
TONNAGE_WHALE          → тоннаж ≥ 50 000 кг
TONNAGE_TRAIN          → тоннаж ≥ 100 000 кг
TONNAGE_BOEING         → тоннаж ≥ 400 000 кг
TONNAGE_FERRY          → тоннаж ≥ 1 000 000 кг
TONNAGE_ISS            → тоннаж ≥ 5 000 000 кг
FIRST_PR               → первый личный рекорд
PR_10                  → 10 личных рекордов
EXERCISES_10           → выполнено 10 разных упражнений
WORKOUTS_10            → 10 тренировок всего
WORKOUTS_50            → 50 тренировок всего

Алгоритм:
1. Получить все уже разблокированные ачивки пользователя
2. Для каждой незаблокированной — проверить условие
3. Если условие выполнено — создать user_achievement
4. Отправить WebSocket уведомление с новыми ачивками

Функция должна быть идемпотентной (повторный вызов не создаёт дубли).
```

---

## 🐳 DevOps

### Dockerfile для backend

**Агенты:** **Один чат (devops или backend)**.

```
Создай backend/Dockerfile — multi-stage build для FastAPI.

Stage 1 (builder):
- python:3.11-slim
- Устанавливает зависимости из requirements.txt в /wheels

Stage 2 (runtime):
- python:3.11-slim
- Копирует /wheels из builder
- Копирует исходники
- USER: non-root (appuser)
- Healthcheck: curl http://localhost:8000/health
- CMD: uvicorn main:app --host 0.0.0.0 --port 8000 --workers 1

Для development: добавить --reload в CMD.
Согласуй EXPOSE и сети с docker-compose.yml проекта.
```

### Dockerfile для Next.js

**Агенты:** **Один чат (devops или frontend)**.

```
Проверь и при необходимости обнови существующий web/Dockerfile.

Уже в проекте: web/next.config.mjs с output: "standalone", Node 20 в Dockerfile можно выровнять с локальной LTS.

Требования:
- Multi-stage: deps → builder → runner
- В runner только standalone-артефакты и static
- USER nextjs (non-root), EXPOSE 3000, CMD node server.js
- ARG для NEXT_PUBLIC_API_URL на этапе build при необходимости

Не ломай локальный npm run dev; Docker — для production-слоя.
```

---

## 🧪 Тесты

### Тесты для упражнений

**Агенты:** **Один чат (qa / backend)**.

```
Создай backend/tests/test_exercises.py — тесты для endpoints упражнений.

Используй pytest-asyncio, httpx.AsyncClient.

Тесты:
- test_get_exercises_public — неавторизованный может получить список
- test_get_exercises_filter_by_muscle — фильтр по muscle_group работает
- test_get_exercise_detail — детали по ID
- test_create_exercise_as_trainer — тренер может создать упражнение
- test_create_exercise_as_user_forbidden — обычный user получает 403
- test_search_exercises — поиск по имени возвращает правильные результаты
- test_upload_exercise_image — загрузка изображения (мок MinIO)

Fixture: create_test_user, create_test_trainer, create_test_exercise, async_client.

Запуск: из каталога backend/ с venv (см. docs/VENV_SETUP.md).
```
