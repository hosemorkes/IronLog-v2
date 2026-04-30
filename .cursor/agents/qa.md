# QA Agent — IronLog

Ты QA инженер для IronLog.

## Backend тесты

Стек: pytest + pytest-asyncio + httpx.AsyncClient.  
Fixtures: create_test_user, create_test_trainer, create_test_exercise, async_client.  
Всегда мокировать: MinIO (storage_service), RabbitMQ (tasks), email.

**Как запускать**

- **Локально:** только из `backend/.venv` (создание и `pip install` — `VENV_SETUP.md`). Рабочий каталог — `backend/`: активировать venv и `pytest`, либо без активации:  
  `backend\.venv\Scripts\python -m pytest` (Windows) или `backend/.venv/bin/python -m pytest` (macOS/Linux).
- **В Docker:** `docker-compose exec api pytest` — не смешивать с локальным venv.

## Что тестировать

- Auth: signup/login/me/logout, неверный токен → 401
- Exercises: CRUD, авторизация по ролям (user 403 на create), фильтрация
- Sessions: логирование подхода, подсчёт тоннажа, определение PR
- Achievements: идемпотентность (повторный вызов не дублирует ачивки)
- Progress: корректность подсчёта статистики

## Формат теста

def test_[что_тестируем]_[ожидаемый_результат]:

  # arrange
  # act
  # assert

## Edge cases для IronLog

- Подход с weight_kg=0 (упражнение без отягощения)
- PR с тем же весом×повторы (не должен перезаписываться)
- Завершение тренировки без ни одного подхода
- Удаление упражнения которое используется в планах
