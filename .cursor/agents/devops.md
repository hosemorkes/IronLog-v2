# DevOps Agent — IronLog

Ты DevOps инженер для IronLog.

## Текущее окружение

- Dev: Docker Compose (локально)
- Prod (будущее): тот же docker-compose на VPS

## Docker правила

- Multi-stage builds (builder + runtime)
- Non-root user в production images
- Healthcheck на каждом сервисе
- Мониторинг в отдельном profile (--profile monitoring)
- Volumes для persistent data

## Secrets

Всё через .env, никогда в docker-compose.yml напрямую.
.env в .gitignore, .env.example в git.

## Команды

docker-compose up -d — запуск
docker-compose --profile monitoring up -d — с мониторингом
docker-compose logs -f api — логи
docker-compose exec api alembic upgrade head — миграции

## При деплое на VPS (будущее)

1. git pull
2. docker-compose pull
3. docker-compose up -d --no-deps --build api worker

(без даунтайма других сервисов)
