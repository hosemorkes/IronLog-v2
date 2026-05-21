# 🏗️ IronLog — Архитектура проекта

## Стек технологий

| Слой | Технология | Версия | Порт |
|------|-----------|--------|------|
| Web App (PWA) | Next.js (App Router) | 14+ | 3000 |
| Admin Panel | Next.js | 14+ | 3002 |
| Mobile (опц.) | Flutter | 3.x | — |
| API | FastAPI + Uvicorn | 0.104+ | 8000 |
| База данных | PostgreSQL | 15 | 5432 |
| Кеш / Сессии | Redis | 7 | 6379 |
| Файловое хранилище | MinIO | RELEASE.2024 | 9000 |
| Очередь задач | RabbitMQ | 3.12 | 5672 |
| Воркеры | Dramatiq | 1.15 | — |

**Инфраструктура:** в типовом **`docker-compose.yml`** сервисы **`worker`** и контейнер **`admin`** (:3002) могут быть отключены (закомментированы); логика API и каталоги в репозитории сохраняются. Сборка **web** для домена — **`docker-compose.override.yml.example`**, см. `README.md` (раздел «Деплой на VPS»).

---

## Диаграмма системы

```
┌─────────────────────────────────────────────────────────────────┐
│                        TIER 1: КЛИЕНТЫ                          │
├──────────────────┬──────────────────┬──────────────────────────┤
│  Next.js Web     │  Next.js Admin   │  Flutter App             │
│  (PWA) :3000     │  Panel :3002     │  (iOS/Android) — опц.    │
└────────┬─────────┴────────┬─────────┴──────────┬───────────────┘
         │                  │                     │
         └──────────────────┼─────────────────────┘
                            │  REST + WebSocket
                 ┌──────────▼───────────┐
                 │  FastAPI + Uvicorn   │
                 │  REST  /api/*        │
                 │  WS    /ws/{user_id} │
                 │  Auth  JWT           │
                 │  :8000               │
                 └──┬──────┬──────┬────┘
                    │      │      │
          ┌─────────▼┐ ┌───▼───┐ ┌▼────────┐ ┌──────────┐
          │PostgreSQL│ │ Redis │ │  MinIO  │ │RabbitMQ  │
          │  :5432   │ │ :6379 │ │  :9000  │ │  :5672   │
          │          │ │       │ │         │ │          │
          │users     │ │sess.  │ │exercise/│ │email     │
          │exercises │ │cache  │ │  imgs   │ │analytics │
          │workouts  │ │tokens │ │gifs     │ │reports   │
          │sessions  │ │queues │ │videos   │ │notifs    │
          │sets      │ │       │ │         │ │          │
          │programs  │ │       │ │         │ │          │
          └──────────┘ └───────┘ └─────────┘ └──────────┘
                                                  │
                                     ┌────────────▼───────────┐
                                     │   Dramatiq Workers     │
                                     │  • send_email          │
                                     │  • calc_achievements   │
                                     │  • generate_report     │
                                     │  • push_notification   │
                                     │  • check_pr_records    │
                                     └────────────────────────┘
```

---

## Три ключевые сущности (принцип разделения)

```
Exercise          → справочник, создаётся Admin/Trainer, неизменяемый базис
WorkoutTemplate   → план (набор упражнений + сеты/повторы/вес), создаёт User или Trainer
WorkoutLog        → факт выполнения: конкретный день, конкретные результаты

БЕЗ этого разделения — невозможна корректная статистика и прогрессия
```

---

## Роли пользователей

| Роль | Права |
|------|-------|
| `user` | Создаёт свои планы, тренируется solo, ищет тренера, видит свой прогресс |
| `trainer` | Все права user + создаёт упражнения + управляет учениками + видит их прогресс |
| `admin` | Все + управление ролями, блокировка, CRUD упражнений |

---

## API Endpoints (полный список)

### Auth
```
POST   /api/auth/signup
POST   /api/auth/login
GET    /api/auth/me            роль в ответе
PUT    /api/auth/me            тело: { "username" } — смена имени (3–30 символов, уникальность)
POST   /api/auth/logout
POST   /api/auth/refresh
```

### Упражнения
```
GET    /api/exercises              фильтры: muscle_group, equipment, difficulty
GET    /api/exercises/{id}
GET    /api/exercises/{id}/gif-url presigned URL на demo.gif (TTL 1 ч); в БД — только путь, не URL
POST   /api/exercises              TRAINER/ADMIN (полная форма)
PUT    /api/exercises/{id}         TRAINER/ADMIN
DELETE /api/exercises/{id}         ADMIN
POST   /api/exercises/{id}/upload-image  TRAINER/ADMIN — картинка в MinIO

POST   /api/user/exercises         любой JWT — кастомное упражнение (created_by = пользователь)
```

### Планы тренировок (User)
```
POST   /api/user/plans
GET    /api/user/plans
GET    /api/user/plans/{id}
PUT    /api/user/plans/{id}
DELETE /api/user/plans/{id}
```

### Сессии (логирование)
```
POST   /api/user/sessions                    начать тренировку
GET    /api/user/sessions                    история (пагинация)
GET    /api/user/sessions/{id}               детали сессии владельца: session_id, plan_id, started_at,
                                          completed_at, total_volume_kg, notes; sets — подходы с полным exercise;
                                          exercises — группировка: exercise_id, exercise_name, sets[{set_num, reps_done, weight_kg}]
POST   /api/user/sessions/{id}/sets          логировать подход
PUT    /api/user/sessions/{id}               завершить
```

### Прогресс
```
GET    /api/user/progress
GET    /api/user/progress/weekly
GET    /api/user/progress/exercises
GET    /api/user/progress/exercises/{exercise_id}
GET    /api/user/pr                          personal records
```

### Достижения
```
GET    /api/user/achievements
```

### Тренеры
```
GET    /api/trainers
GET    /api/trainers/{id}
POST   /api/trainers/{id}/request            User запрашивает тренера
```

### Управление тренером
```
GET    /api/trainer/requests
POST   /api/trainer/requests/{id}/accept
POST   /api/trainer/requests/{id}/reject
GET    /api/trainer/clients
GET    /api/trainer/clients/{id}/progress
POST   /api/trainer/clients/{id}/plans       создать план для ученика
```

### Admin
```
GET    /api/admin/users
PATCH  /api/admin/users/{id}/role
PATCH  /api/admin/users/{id}/block
GET    /api/admin/stats
```

### WebSocket
```
WS     /ws/{user_id}              real-time синхронизация тренировки
```

---

## База данных — схема

```sql
-- Пользователи
users (id UUID PK, email, username, hashed_password, role ENUM,
       fitness_level, bio, avatar_url,
       is_trainer, specialization, hourly_rate, experience_years,
       is_active, created_at, updated_at)

-- Упражнения
exercises (id UUID PK, name, name_ru, muscle_group, secondary_muscles[],
           equipment, difficulty ENUM, description, technique_steps JSONB,
           image_url, gif_url, created_by UUID FK→users, created_at)

-- Планы тренировок
workout_plans (id UUID PK, user_id FK, trainer_id FK NULL,
               name, description, difficulty, is_template,
               created_at, updated_at)

-- Упражнения в плане
plan_exercises (id UUID PK, plan_id FK, exercise_id FK,
                order_num, sets, reps, weight_kg, rest_seconds, notes)

-- Сессии выполнения
workout_sessions (id UUID PK, user_id FK, plan_id FK NULL,
                  started_at, completed_at, notes, total_volume_kg)

-- Подходы
workout_sets (id UUID PK, session_id FK, exercise_id FK,
              set_num, reps_done, weight_kg, duration_seconds,
              is_pr, created_at)

-- Личные рекорды
personal_records (id UUID PK, user_id FK, exercise_id FK,
                  weight_kg, reps, volume_kg, achieved_at)

-- Связь тренер–ученик
trainer_client_connections (id UUID PK, trainer_id FK, client_id FK,
                             status ENUM pending/accepted/rejected,
                             initiated_by ENUM trainer/client,
                             created_at, updated_at)

-- Достижения (определение)
achievements (id UUID PK, code VARCHAR UNIQUE, name, description,
              icon, condition_type, condition_value, created_at)

-- Достижения пользователей
user_achievements (id UUID PK, user_id FK, achievement_id FK,
                   unlocked_at)
```

---

## Хранение данных по сервисам

### PostgreSQL
Все реляционные данные (см. схему выше).

### Redis
```
session:{token}              → {user_id, role, expires}    TTL 30д
refresh:{token}              → {user_id}                   TTL 90д
cache:exercises              → JSON список                  TTL 1д
cache:user:{id}:plans        → JSON планы                  TTL 1д
cache:user:{id}:stats        → JSON статистика             TTL 1ч
queue:email                  → email задачи
queue:analytics              → аналитика
```

### MinIO

Бакет по умолчанию: **`ironlog-exercises`** (`MINIO_BUCKET_EXERCISES`). Ключи объектов:

```
exercises/{exercise_id}/image.jpg
exercises/{exercise_id}/image.jpg   # image_url в БД — этот путь; web — NEXT_PUBLIC_MEDIA_URL + getMediaUrl()
exercises/{exercise_id}/demo.gif   # gif_url в БД — этот путь; клиенту — GET .../gif-url (presigned)
user-uploads/{user_id}/avatar.jpg
user-uploads/{user_id}/workout-{session_id}.mp4
```

Опциональное наполнение каталога:

- **ExerciseDB (RapidAPI):** `python -m seeds.import_exercisedb` — `Makefile` `import-exercises*`, `RAPIDAPI_KEY` в `backend/.env`; **`name_ru`** = **`name`** (EN); медиа — `demo.gif`.
- **free-exercise-db (офлайн):** `python -m seeds.import_free_exercise_db` — `Makefile` `import-free-exercises*`; JSON **`exercises_translated.json`** (`name_ru` на RU, ~873) в `.gitignore`; медиа — `image.jpg` из [raw GitHub](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/); флаг **`--update-images`** — догрузка картинок для уже импортированных записей без `image_url`.

Оба импорта идемпотентны по **`name`** (англ.), маппинг мышц/оборудования — `import_exercisedb.py`. Основной RU-каталог MVP — `seeds.exercises` из PRODUCT_NOTES.

**Web и медиа упражнений:** в ответах API поля **`image_url`** / **`gif_url`** — относительные ключи объектов MinIO (не HTTP URL). Превью на **`/exercises`** и **`/exercises/[id]`** собирает **`getMediaUrl()`** (`web/lib/utils/media.ts`) из **`NEXT_PUBLIC_MEDIA_URL`** и пути из API.

### RabbitMQ очереди
```
email_notifications    → welcome, password_reset, workout_report
analytics_tasks        → calculate_stats, weekly_summary
report_generation      → generate_pdf, generate_text_report
notifications          → push_notification, achievement_unlocked
achievement_checks     → check_after_workout
```

---

## Flow: тренировка от начала до конца

```
1. User жмёт "Начать тренировку"
   → POST /api/user/sessions
   → Создаётся workout_session в PostgreSQL

2. User логирует подходы
   → POST /api/user/sessions/{id}/sets
   → Запись в workout_sets
   → Кеш в Redis (быстрый доступ)
   → WebSocket update на фронт

3. User завершает тренировку
   → PUT /api/user/sessions/{id}
   → completed_at + total_volume_kg записывается
   → Задача в RabbitMQ:
     • check_pr_records    (новый рекорд?)
     • calc_achievements   (новая ачивка?)
     • update_progress     (статистика)
     • send_notification   (поздравление)

4. Dramatiq Worker обрабатывает
   → PR записывается в personal_records
   → Ачивки в user_achievements
   → WebSocket: "Новый рекорд! 🏆"
```

---

## Масштабирование

```
MVP (сейчас)    → docker-compose, один VPS 2-4GB RAM
Growth          → несколько VPS, managed PostgreSQL
Enterprise      → Kubernetes, PostgreSQL HA, Redis Cluster
```

**Ключевое:** архитектура позволяет переходить между этапами без изменения кода API.
