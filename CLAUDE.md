# IronLog — CLAUDE.md
# Инструкции для Claude в Cursor (прочитай перед началом работы)

## Что это за проект

**IronLog** — тренировочный трекер.  
Три ключевые сущности: `Exercise` (справочник) → `WorkoutTemplate` (план) → `WorkoutLog` (факт выполнения).

**Стек:**
- Backend: FastAPI + Python 3.11 + PostgreSQL 15 + Redis 7 + RabbitMQ + MinIO + Dramatiq
- Frontend: Next.js 14 (App Router, PWA) + TypeScript + Tailwind CSS
- Admin: Next.js 14 (отдельный сервис)
- Dev окружение: Docker Compose

## Архитектурные решения (не переделывай без спроса)

1. **UUID** как PK везде (не serial)
2. **Async-first** в FastAPI — все I/O операции async
3. **SQLAlchemy 2.x** с AsyncSession, миграции через Alembic
4. **Dramatiq** (не Celery) для фоновых задач через RabbitMQ
5. **Pydantic v2** для схем
6. **App Router** в Next.js (не Pages Router)
7. **Zustand** для клиентского состояния
8. **React Query** для server state / fetching

## Текущий статус

Смотри `ROADMAP.md` — чекбоксы показывают что готово.  
Полная архитектура, сервисы и дерево каталогов — `docs/ARCHITECTURE.md`, `docs/MICROSERVICES.md`, `docs/PROJECT_STRUCTURE.md`.  
Начинаем с Фазы 1 (MVP Solo): библиотека упражнений → конструктор → режим выполнения.

## Как работать с задачами

### Создание нового endpoint'а:
1. Модель в `backend/models/`
2. Схема в `backend/schemas/`
3. Сервис в `backend/services/`
4. Роутер в `backend/routes/`
5. Подключить в `backend/main.py`
6. Миграция: `alembic revision --autogenerate -m "add_table"`

### Создание новой страницы:
1. Файл в `web/app/(app)/route/page.tsx`
2. Компоненты в `web/components/`
3. Хук данных в `web/lib/hooks/`
4. Добавить в нижнюю навигацию если нужно

## Дизайн система

Цвета (берём из макетов):
```
--color-bg-dark:     #141414
--color-surface:     #1c1c1c
--color-border:      #252525
--color-accent:      #7c6ef2   /* primary purple */
--color-accent-dark: #5b4ff0
--color-blue:        #5ba3d9   /* muscle tags */
--color-text:        #ffffff
--color-muted:       #888888
```

Светлая тема:
```
--color-bg-light:    #f5f5f5
--color-surface-l:   #ffffff
--color-border-l:    #e8e8e8
```

Компоненты из макетов уже готовы — смотри `exercise_library_mockup.html` и `exercise_detail_mockup.html`.

## Упражнения (сид-данные)

60+ упражнений перечислены в `docs/PRODUCT_NOTES.md` (раздел «Каталог упражнений»). При создании сида использовать их все.  
Группы мышц: Грудь, Спина, Ноги, Плечи, Руки, Пресс, Разминка/Кардио.  
Equipment: Штанга, Гантели, Тренажёр, Кроссовер, Своё тело.

## Тоннаж — шкала объектов

| Кг | Объект |
|----|--------|
| 200 | Бурый медведь |
| 500 | Лошадь |
| 1 000 | Lada Granta |
| 3 000 | Белый медведь ×10 |
| 5 000 | Африканский слон |
| 10 000 | ГАЗель |
| 20 000 | Танк Т-72 |
| 50 000 | Синий кит |
| 100 000 | Локомотив ЧС7 |
| 400 000 | Боинг 747 |
| 1 000 000 | Паром |
| 5 000 000 | МКС |

## Роли

- `user` — solo тренировки + поиск тренера
- `trainer` — всё user + создание упражнений + управление учениками
- `admin` — всё + управление ролями и блокировка

## Запуск окружения

```bash
# Основные сервисы
docker-compose up -d

# С мониторингом
docker-compose --profile monitoring up -d

# Миграции
docker-compose exec api alembic upgrade head

# Сид упражнений
docker-compose exec api python -m seeds.exercises

# Логи
docker-compose logs -f api
```

## Тесты backend

- **Локально (вне Docker):** использовать только интерпретатор из `backend/.venv` (см. `VENV_SETUP.md`). После активации venv — `pytest` из каталога `backend/`; без активации:  
  `backend\.venv\Scripts\python -m pytest` (Windows) или `backend/.venv/bin/python -m pytest` (macOS/Linux).
- **Через Docker:** `docker-compose exec api pytest` (как в `README.md`) — это уже окружение контейнера, не путать с локальным `pytest` из системного Python.

Запускать тесты «просто `pytest`» из корня репозитория без venv не нужно — часто другой Python и нет зависимостей.

## Что НЕ надо трогать

- `migrations/` — не редактируй вручную, только через alembic
- `docker-compose.yml` — структура зафиксирована, менять только .env
- Цвета дизайна — строго из дизайн-системы выше
