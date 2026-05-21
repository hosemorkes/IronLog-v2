# 📁 IronLog — Структура проекта

```
ironlog/                                   # Корневая папка
│
├── backend/                               # FastAPI Backend (Python 3.11+)
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── .env                               # Переменные (не в git)
│   ├── .env.example
│   ├── alembic.ini
│   ├── main.py                            # FastAPI app, роутеры, CORS, lifespan
│   ├── config.py                          # Settings (pydantic-settings)
│   ├── database.py                        # AsyncEngine, get_db dependency
│   ├── auth.py                            # JWT create/verify, get_current_user
│   │
│   ├── models/                            # SQLAlchemy ORM модели
│   │   ├── __init__.py
│   │   ├── user.py                        # User, роль ENUM
│   │   ├── exercise.py                    # Exercise
│   │   ├── workout.py                     # WorkoutPlan, PlanExercise
│   │   ├── session.py                     # WorkoutSession, WorkoutSet
│   │   ├── progress.py                    # PersonalRecord
│   │   ├── connection.py                  # TrainerClientConnection
│   │   └── achievement.py                 # Achievement, UserAchievement
│   │
│   ├── schemas/                           # Pydantic схемы (request/response)
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── auth_me.py                     # CurrentUserResponse, CurrentUserSelfUpdate (PUT /auth/me)
│   │   ├── exercise.py
│   │   ├── workout.py
│   │   ├── session.py
│   │   ├── progress.py
│   │   └── achievement.py
│   │
│   ├── routes/                            # API роутеры
│   │   ├── __init__.py
│   │   ├── auth.py                        # /api/auth/*
│   │   ├── exercises.py                   # /api/exercises/*
│   │   ├── user_exercises.py              # POST /api/user/exercises — кастомное упражнение
│   │   ├── user_plans.py                  # /api/user/plans/*
│   │   ├── user_sessions.py               # /api/user/sessions/*
│   │   ├── user_progress.py               # /api/user/progress/*
│   │   ├── user_achievements.py           # /api/user/achievements
│   │   ├── trainers.py                    # /api/trainers/*
│   │   ├── trainer_manage.py              # /api/trainer/* (для тренера)
│   │   └── admin.py                       # /api/admin/*
│   │
│   ├── services/                          # Бизнес-логика
│   │   ├── __init__.py
│   │   ├── auth_service.py                # Регистрация, login, refresh
│   │   ├── workout_service.py             # Подсчёт тоннажа, прогрессия
│   │   ├── pr_service.py                  # Проверка Personal Records
│   │   ├── achievement_service.py         # Проверка и выдача ачивок
│   │   ├── storage_service.py             # MinIO upload/delete/url
│   │   └── export_service.py              # Генерация текстового отчёта
│   │
│   ├── tasks/                             # Dramatiq async tasks
│   │   ├── __init__.py                    # broker = RabbitmqBroker(...)
│   │   ├── notifications.py               # send_email, push_notification
│   │   ├── analytics.py                   # calculate_stats, weekly_report
│   │   ├── reports.py                     # generate_text_report, generate_pdf
│   │   └── achievements.py                # check_achievements_after_workout
│   │
│   ├── websocket/
│   │   ├── __init__.py
│   │   └── manager.py                     # ConnectionManager (connect/disconnect/broadcast)
│   │
│   ├── migrations/                        # Alembic миграции
│   │   ├── env.py
│   │   ├── script.py.mako
│   │   └── versions/
│   │       └── 001_initial.py
│   │
│   ├── seeds/                             # Начальные данные
│   │   ├── db.py                          # DATABASE_URL для CLI-сидов
│   │   ├── exercises.py                   # 60+ упражнений из PRODUCT_NOTES (RU)
│   │   ├── import_exercisedb.py           # Опционально: ExerciseDB (RapidAPI) → Postgres + MinIO (GIF)
│   │   ├── import_free_exercise_db.py     # Опционально: free-exercise-db JSON → Postgres + MinIO (image.jpg)
│   │   ├── exercises_raw.json             # Офлайн-дамп каталога (EN), в .gitignore
│   │   ├── exercises_translated.json      # free-exercise-db + name_ru (RU, ~873), в .gitignore
│   │   └── achievements.py                # Определения ачивок
│   │
│   └── tests/
│       ├── conftest.py
│       ├── test_auth.py
│       ├── test_exercises.py
│       ├── test_sessions.py
│       └── test_progress.py
│
├── web/                                   # Next.js Web App (PWA) :3000
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.js                     # PWA конфиг (next-pwa)
│   ├── tailwind.config.ts
│   ├── .env.local                         # NEXT_PUBLIC_API_URL, NEXT_PUBLIC_MEDIA_URL (локально)
│   ├── .env.example                       # Шаблон NEXT_PUBLIC_* для web
│   ├── .env.local.example
│   ├── app/                               # App Router
│   │   ├── layout.tsx                     # Root: стили, скрипт темы, Providers
│   │   ├── page.tsx                       # Landing / redirect
│   │   ├── globals.css
│   │   │
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── signup/page.tsx
│   │   │
│   │   ├── (app)/                         # Защищённые роуты
│   │   │   ├── layout.tsx                 # Проверка авторизации, нижняя навигация
│   │   │   ├── dashboard/page.tsx         # /dashboard — тоннаж, PR, ачивки
│   │   │   │
│   │   │   ├── exercises/
│   │   │   │   ├── page.tsx               # /exercises — библиотека
│   │   │   │   ├── new/page.tsx           # /exercises/new — кастомное упражнение
│   │   │   │   └── [id]/page.tsx          # /exercises/[id] — карточка
│   │   │   │
│   │   │   ├── workouts/
│   │   │   │   ├── page.tsx               # /workouts — мои планы
│   │   │   │   ├── new/page.tsx           # /workouts/new — конструктор
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx           # /workouts/123 — детали плана
│   │   │   │       └── edit/page.tsx      # /workouts/123/edit
│   │   │   │
│   │   │   ├── session/
│   │   │   │   ├── [id]/page.tsx          # /session/123 — активная тренировка
│   │   │   │   └── history/page.tsx       # /session/history — история
│   │   │   │
│   │   │   ├── trainers/
│   │   │   │   ├── page.tsx               # /trainers — список тренеров
│   │   │   │   └── [id]/page.tsx          # /trainers/123 — профиль тренера
│   │   │   │
│   │   │   ├── achievements/page.tsx      # /achievements
│   │   │   └── profile/page.tsx           # /profile
│   │   │
│   │   └── api/                           # Next.js API Routes (proxy)
│   │       ├── auth/[...nextauth]/route.ts
│   │       └── proxy/[...path]/route.ts   # Прокси к FastAPI
│   │
│   ├── components/
│   │   ├── ui/                            # Атомарные компоненты
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Input.tsx
│   │   │   └── Modal.tsx
│   │   │
│   │   ├── exercises/
│   │   │   ├── ExerciseCard.tsx           # Карточка из макета
│   │   │   ├── ExerciseDetail.tsx         # Детальная карточка
│   │   │   ├── MuscleMap.tsx              # SVG-фигура мышц
│   │   │   ├── FilterChips.tsx
│   │   │   └── ExerciseSearch.tsx
│   │   │
│   │   ├── workout/
│   │   │   ├── WorkoutBuilder.tsx         # Конструктор плана
│   │   │   ├── ActiveSession.tsx          # Режим выполнения
│   │   │   ├── RestTimer.tsx              # Таймер отдыха
│   │   │   ├── SetLogger.tsx              # Ввод подхода
│   │   │   └── WorkoutSummary.tsx         # Итог тренировки
│   │   │
│   │   ├── dashboard/
│   │   │   ├── TonnageWidget.tsx          # Тоннаж + шкала объектов
│   │   │   ├── WeeklyChart.tsx            # График за неделю
│   │   │   ├── PRWidget.tsx               # Последние рекорды
│   │   │   └── AchievementsWidget.tsx
│   │   │
│   │   └── layout/
│   │       ├── BottomNav.tsx              # Нижняя навигация (из макета)
│   │       ├── Header.tsx
│   │       └── ThemeToggle.tsx
│   │
│   ├── lib/
│   │   ├── api.ts                         # apiUrl, apiFetch + Bearer
│   │   ├── constants/theme.ts             # IRONLOG_THEME_STORAGE_KEY
│   │   ├── utils/media.ts                 # getMediaUrl — NEXT_PUBLIC_MEDIA_URL + путь MinIO
│   │   ├── hooks/
│   │   │   ├── useExercises.ts            # каталог, useCreateCustomExercise
│   │   │   ├── useWorkouts.ts
│   │   │   ├── useSessions.ts             # история, деталь, fetchSessionDetail
│   │   │   ├── useTheme.ts, ThemeProvider.tsx
│   │   │   ├── useDefaultRest.ts
│   │   │   └── …                          # хуки дашборда и страниц
│   │   ├── session/buildExportText.ts     # текст экспорта сессии
│   │   └── stores/authStore.ts            # Zustand: auth, updateUsername
│   │
│   └── public/
│       ├── manifest.json                  # PWA manifest
│       ├── icon-192x192.png
│       ├── icon-512x512.png
│       └── favicon.ico
│
├── admin/                                 # Next.js Admin Panel :3002
│   ├── Dockerfile
│   ├── package.json
│   ├── .env.local
│   │
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                       # /admin — дашборд
│   │   ├── users/
│   │   │   ├── page.tsx                   # Список пользователей
│   │   │   └── [id]/page.tsx              # Управление пользователем
│   │   ├── exercises/
│   │   │   ├── page.tsx                   # Список упражнений
│   │   │   ├── new/page.tsx               # Создание
│   │   │   └── [id]/edit/page.tsx         # Редактирование + загрузка медиа
│   │   └── stats/page.tsx                 # Аналитика
│   │
│   └── components/
│       ├── DataTable.tsx
│       ├── ExerciseForm.tsx               # Форма + загрузка изображения в MinIO
│       └── UserRoleManager.tsx
│
├── docker-compose.yml                     # ГЛАВНЫЙ ФАЙЛ (worker/admin могут быть закомментированы)
├── docker-compose.override.yml.example    # Шаблон NEXT_PUBLIC_* для web на VPS
├── docker-compose.override.yml            # Не в git; docker compose подмешивает автоматически
├── prometheus.yml
├── grafana-dashboards/
│   └── ironlog-dashboard.json
│
├── .github/
│   └── workflows/
│       ├── test.yml
│       ├── deploy-api.yml
│       └── deploy-web.yml
│
├── .gitignore
├── .env.example                           # Шаблон всех переменных
├── Makefile                               # Удобные команды
└── README.md
```

---

## Makefile — быстрые команды

```makefile
up:
	docker-compose up -d

down:
	docker-compose down

logs:
	docker-compose logs -f api

migrate:
	docker-compose exec api alembic upgrade head

seed:
	docker-compose exec api python -m seeds.exercises

test:
	docker-compose exec api pytest

shell:
	docker-compose exec api python

psql:
	docker-compose exec postgres psql -U ironlog -d ironlog

import-exercises:
	docker-compose exec api python -m seeds.import_exercisedb --api-key $(RAPIDAPI_KEY)

import-exercises-no-gifs:
	docker-compose exec api python -m seeds.import_exercisedb --api-key $(RAPIDAPI_KEY) --skip-gifs

import-free-exercises:
	docker compose exec api python -m seeds.import_free_exercise_db

import-free-exercises-no-images:
	docker compose exec api python -m seeds.import_free_exercise_db --skip-images
```

**Импорт ExerciseDB (RapidAPI):** ключ **`RAPIDAPI_KEY`** в **`backend/.env`** (или `make import-exercises RAPIDAPI_KEY=...`). Идемпотентность по **`name`** (англ.); **`name_ru`** при импорте дублирует **`name`**. GIF → `exercises/{uuid}/demo.gif`.

**Импорт free-exercise-db (офлайн):** файл **`exercises_translated.json`** (не в git; положить в `backend/seeds/`). `make import-free-exercises` / `import-free-exercises-no-images`; CLI: `--skip-images`, `--limit N`, **`--update-images`**. Идемпотентность по **`name`** (англ.); **`name_ru`** из JSON. Картинки: raw GitHub [yuhonas/free-exercise-db](https://github.com/yuhonas/free-exercise-db) → `exercises/{uuid}/image.jpg`. **`--update-images`** — только UPDATE `image_url` у существующих записей с NULL. Маппинг мышц/оборудования — как в `import_exercisedb.py`.
