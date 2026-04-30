# 🔧 IronLog — Сервисы и их роли

## Обзор

IronLog использует монолитный подход на старте (один FastAPI сервис) с чёткими логическими границами, позволяющими легко вынести сервисы отдельно при росте.

---

## Сервисы в docker-compose

### 1. `api` — FastAPI (порт 8000)

**Что делает:** единственная точка входа для клиентов.

- REST API (`/api/*`) — CRUD всех сущностей
- WebSocket (`/ws/{user_id}`) — real-time синхронизация тренировки
- Авторизация через JWT (проверка в Redis)
- Делегирует долгие операции → RabbitMQ

**Технологии:** Python 3.11, FastAPI, Uvicorn, SQLAlchemy 2.x async, Pydantic v2

---

### 2. `worker` — Dramatiq (нет порта, фоновый процесс)

**Что делает:** обрабатывает асинхронные задачи из очередей RabbitMQ.

Задачи:
| Задача | Очередь | Триггер |
|--------|---------|---------|
| `send_email` | email_notifications | регистрация, сброс пароля |
| `send_push_notification` | notifications | тренер принял запрос, новая ачивка |
| `check_achievements` | achievement_checks | завершение тренировки |
| `calculate_weekly_stats` | analytics_tasks | ежедневно, midnight |
| `generate_workout_report` | report_generation | пользователь запрашивает отчёт |
| `check_pr_records` | analytics_tasks | после логирования подхода |

**Технологии:** Python 3.11, Dramatiq, RabbitMQ broker

---

### 3. `postgres` — PostgreSQL 15 (порт 5432)

**Что хранит:** все реляционные данные (users, exercises, sessions, sets, PRs, achievements).

---

### 4. `redis` — Redis 7 (порт 6379)

**Что хранит:**
- JWT access/refresh токены с TTL
- Кеш списков упражнений и планов
- Промежуточное состояние активной тренировки (быстрый доступ)
- Счётчики для rate limiting

---

### 5. `minio` — MinIO (порт 9000/9001)

**Что хранит:** бинарные файлы.

Бакеты:
- `exercises` — images и GIF демонстрации упражнений
- `user-uploads` — аватары, видео тренировок (опц.)

Доступ: API работает только через presigned URL (прямого публичного доступа нет).

---

### 6. `rabbitmq` — RabbitMQ 3.12 (порт 5672, UI 15672)

**Что делает:** message broker между API и Worker.

Очереди:
- `email_notifications`
- `notifications`
- `achievement_checks`
- `analytics_tasks`
- `report_generation`

---

### 7. `web` — Next.js PWA (порт 3000)

**Что делает:** основное клиентское приложение.

- PWA (работает offline)
- Тёмная + светлая тема
- Все пользовательские сценарии (тренировки, библиотека, прогресс)

---

### 8. `admin` — Next.js Admin Panel (порт 3002)

**Что делает:** инструмент управления контентом.

- CRUD упражнений + загрузка медиа
- Управление пользователями и ролями
- Базовая аналитика

---

## Мониторинг (profile: monitoring)

Запуск: `docker-compose --profile monitoring up -d`

| Сервис | Порт | Назначение |
|--------|------|-----------|
| pgAdmin | 5050 | GUI для PostgreSQL |
| Redis Commander | 8081 | GUI для Redis |
| RabbitMQ UI | 15672 | Мониторинг очередей (guest/guest) |
| Flower | 5555 | Мониторинг Dramatiq задач |
| Prometheus | 9090 | Сбор метрик |
| Grafana | 3003 | Дашборды метрик |

---

## Что будет отдельным сервисом при росте

При достижении нагрузки или необходимости масштабирования:

1. **Notification Service** — отдельный микросервис для push/email, сейчас в Worker
2. **Media Service** — отдельный сервис обработки изображений (ресайз, конвертация GIF)
3. **Analytics Service** — отдельная БД (TimescaleDB) для временных рядов прогресса
4. **Auth Service** — отдельный сервис токенов при переходе на микросервисы

До этих сценариев — всё в одном API, граница только логическая.
