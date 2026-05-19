.PHONY: up down logs migrate seed test shell psql import-exercises import-exercises-no-gifs

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
