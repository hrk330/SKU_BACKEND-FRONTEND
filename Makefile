.PHONY: help build up down migrate makemigrations createsuperuser test lint format clean seed-data

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

build: ## Build Docker images
	docker-compose build

up: ## Start local development environment
	docker-compose up -d

down: ## Stop local development environment
	docker-compose down

up-neon: ## Start with Neon database (requires DATABASE_URL env var)
	docker-compose -f docker-compose.neon.yml up -d

down-neon: ## Stop Neon environment
	docker-compose -f docker-compose.neon.yml down

migrate: ## Run database migrations
	docker-compose exec web python manage.py migrate

makemigrations: ## Create new database migrations
	docker-compose exec web python manage.py makemigrations

createsuperuser: ## Create Django superuser
	docker-compose exec web python manage.py createsuperuser

test: ## Run tests
	docker-compose exec web python manage.py test

test-pytest: ## Run tests with pytest
	docker-compose exec web pytest

lint: ## Run linting
	docker-compose exec web black --check .
	docker-compose exec web isort --check-only .

format: ## Format code
	docker-compose exec web black .
	docker-compose exec web isort .

seed-data: ## Load seed data
	docker-compose exec web python manage.py seed_data

collectstatic: ## Collect static files
	docker-compose exec web python manage.py collectstatic --noinput

shell: ## Open Django shell
	docker-compose exec web python manage.py shell

logs: ## Show logs
	docker-compose logs -f web

clean: ## Clean up containers and volumes
	docker-compose down -v
	docker system prune -f
