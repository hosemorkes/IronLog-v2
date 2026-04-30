# 🗺️ IronLog — Дорожная карта

## Концепция проекта

**IronLog** — тренировочный трекер с тремя ключевыми сущностями:
- `Exercise` — базовый кирпичик, неизменный справочник
- `Workout Template` — набор упражнений с параметрами (сеты, повторы, вес)
- `Workout Log` — конкретный день, конкретные результаты

Стек: **FastAPI** + **Next.js (PWA)** + **Next.js Admin** + **PostgreSQL** + **Redis** + **MinIO** + **RabbitMQ**

---

## Фаза 1 — MVP Solo (недели 1–4)

Цель: один пользователь может тренироваться без авторизации / с минимальной авторизацией.

### 1.1 Инфраструктура
- [ ] Настроить `docker-compose.yml` (postgres, redis, rabbitmq, minio, api, web, admin)
- [ ] `.env` файлы для всех сервисов
- [ ] Health-check endpoint `GET /health`
- [ ] Базовые миграции Alembic (таблицы users, exercises)

### 1.2 Библиотека упражнений
- [ ] Модель `Exercise` (name, muscle_group, equipment, difficulty, image_url, gif_url)
- [ ] Сид: 60+ упражнений из списка (см. `docs/PRODUCT_NOTES.md`)
- [ ] `GET /api/exercises` — список с фильтрацией по muscle_group / equipment
- [ ] `GET /api/exercises/{id}` — детальная карточка
- [ ] Загрузка изображений в MinIO
- [ ] UI: страница `/exercises` — карточки с тегами, поиск, фильтры по группам мышц
- [ ] UI: страница `/exercises/{id}` — SVG-фигура мышц, техника выполнения, статистика

### 1.3 Конструктор тренировки
- [ ] Модели `WorkoutPlan`, `PlanExercise`
- [ ] `POST/GET/PUT/DELETE /api/user/plans`
- [ ] UI: конструктор — добавить упражнение из библиотеки, задать сеты/повторы/вес

### 1.4 Режим выполнения
- [ ] Модели `WorkoutSession`, `WorkoutSet`
- [ ] `POST /api/user/sessions` — начать тренировку
- [ ] `POST /api/user/sessions/{id}/sets` — залогировать подход
- [ ] `PUT /api/user/sessions/{id}` — завершить
- [ ] UI: таймер отдыха, ввод веса/повторов, прогресс по подходам
- [ ] WebSocket `/ws/{user_id}` — real-time синхронизация

### 1.5 История и дашборд
- [ ] `GET /api/user/progress` — общая статистика
- [ ] `GET /api/user/progress/weekly` — по неделям
- [ ] `GET /api/user/progress/exercises` — прогресс по упражнению
- [ ] UI: страница `/dashboard` — объём за неделю, тоннаж, PR
- [ ] Автоматическая фиксация PR (Personal Record)
- [ ] Шкала тоннажа с объектами (медведь → лошадь → ... → МКС)

### 1.6 Достижения (Ачивки)
- [ ] Таблицы `achievements`, `user_achievements`
- [ ] Проверка ачивок после каждой завершённой тренировки (Dramatiq task)
- [ ] UI: страница достижений (макет: `docs/assets/achievements-map.svg`, спецификация: `docs/PRODUCT_NOTES.md`)

### 1.7 Экспорт тренировки
- [ ] Генерация текстового отчёта о тренировке (Dramatiq task)
- [ ] Кнопка "Скопировать / Отправить" в интерфейсе

---

## Фаза 2 — Coach + Athlete (месяц 2–3)

Цель: добавить роли, авторизацию, связку тренер–ученик.

### 2.1 Авторизация
- [ ] JWT токены (access + refresh)
- [ ] `POST /api/auth/signup`, `/login`, `/logout`, `/me`
- [ ] Роли: `user` / `trainer` / `admin`
- [ ] bcrypt хеширование паролей
- [ ] Redis: хранение сессий и refresh-токенов

### 2.2 Профили и роли
- [ ] Расширенная таблица `users` (bio, avatar, specialization, hourly_rate, experience_years)
- [ ] `GET /api/trainers` — список тренеров
- [ ] `GET /api/trainers/{id}` — профиль
- [ ] Admin: смена роли user → trainer

### 2.3 Система тренер–ученик
- [ ] Таблица `trainer_client_connections` (pending / accepted / rejected)
- [ ] `POST /api/trainers/{id}/request` — запросить тренера (User)
- [ ] `POST /api/trainer/requests/{id}/accept|reject` — ответ тренера
- [ ] `GET /api/trainer/clients` — мои клиенты
- [ ] `GET /api/trainer/clients/{id}/progress` — прогресс ученика
- [ ] Тренер создаёт персональные планы для клиентов
- [ ] WebSocket уведомления при принятии/отклонении запроса

### 2.4 Admin Panel
- [ ] Список всех пользователей, смена ролей
- [ ] CRUD упражнений (создание, редактирование, загрузка медиа)
- [ ] Базовая аналитика: DAU, тренировок за период

### 2.5 Программы (циклы)
- [ ] Сущность `Program` — цикл 4–8 недель (Пн/Ср/Пт)
- [ ] Тренер назначает программу, не разовую тренировку
- [ ] Прогрессия нагрузки: система предлагает +5% веса если план выполнен 3× подряд

---

## Фаза 3 — Growth (месяц 4–6)

- [ ] Push-уведомления (FCM / APNs)
- [ ] Flutter App (iOS/Android) — отдельный клиент к тому же API
- [ ] Суперсеты в конструкторе тренировок
- [ ] PDF-отчёты через Dramatiq
- [ ] Prometheus + Grafana: production метрики
- [ ] CI/CD: GitHub Actions (test → build → deploy)
- [ ] Переезд на VPS (тот же docker-compose)

---

## Технический долг / Зарезервировано

- Kubernetes Cluster (год 2+)
- PostgreSQL HA, Redis Cluster, RabbitMQ Cluster
- CDN для медиа (Cloudflare/CloudFront)
- Sentry для error tracking
