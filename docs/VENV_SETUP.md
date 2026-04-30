# IronLog — Backend Python окружение

## Создание .venv (для локальной разработки вне Docker)

```bash
# В папке backend/
cd backend

python3.11 -m venv .venv   # рекомендуется как в Docker; на Windows: py -3.11

# Активация
source .venv/bin/activate        # macOS / Linux
.venv\Scripts\activate           # Windows

# Установка зависимостей
pip install -r requirements.txt
```

## Запуск pytest (локально)

Из каталога `backend/` с **активированным** `.venv`:

```bash
pytest
```

Или без активации (явный интерпретатор venv):

```bash
# Windows
.venv\Scripts\python -m pytest

# macOS / Linux
.venv/bin/python -m pytest
```

Интеграционные прогоны в контейнере — отдельно: `docker-compose exec api pytest` из корня репозитория (см. `README.md`).

## Python 3.13 + Windows

Если `pip install` падает на сборке **asyncpg** / **pydantic-core** («Microsoft Visual C++ 14.0», `link.exe not found`):

1. Предпочтительно: **Python 3.11** в venv (как в прод-образе) — обычно без компилятора.
2. Либо установить [Build Tools for Visual Studio](https://visualstudio.microsoft.com/visual-cpp-build-tools/) с рабочей нагрузкой **«Разработка классических приложений на C++»**.
3. В `requirements.txt` зафиксированы версии с **готовыми wheels** под 3.13 Win (`asyncpg>=0.30`, `pydantic>=2.10`); после `git pull` повторите `pip install -r requirements.txt`.

## requirements.txt

```
# ── Web Framework ───────────────────────────
fastapi==0.104.1
uvicorn[standard]==0.24.0
python-multipart==0.0.6

# ── Database ─────────────────────────────────
sqlalchemy[asyncio]==2.0.23
asyncpg==0.30.0
alembic==1.12.1

# ── Redis ────────────────────────────────────
redis[hiredis]==5.0.1

# ── Task Queue ───────────────────────────────
dramatiq[rabbitmq,watch]==1.15.0
pika==1.3.2

# ── File Storage ─────────────────────────────
minio==7.2.0

# ── Auth ─────────────────────────────────────
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4

# ── Validation ───────────────────────────────
pydantic==2.12.4
pydantic-settings==2.10.1
email-validator==2.2.0

# ── Email ────────────────────────────────────
aiosmtplib==3.0.0
jinja2==3.1.2

# ── Utils ────────────────────────────────────
python-dotenv==1.2.2
httpx==0.25.2

# ── Monitoring ───────────────────────────────
prometheus-fastapi-instrumentator==6.1.0

# ── Dev / Test ───────────────────────────────
pytest==7.4.3
pytest-asyncio==0.21.1
pytest-cov==4.1.0
factory-boy==3.3.0
```

## .venv в .gitignore

Файл `.venv/` уже добавлен в `.gitignore`. Никогда не коммить виртуальное окружение.

## Примечание

В продакшене (Docker) зависимости устанавливаются прямо в образ через multi-stage build.  
`.venv` нужен только для:
- Local IDE (type checking, autocomplete)
- Запуска тестов вне Docker
- Быстрой отладки отдельных скриптов
