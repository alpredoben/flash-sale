# Makefile for Flash Sale API
# Author: Flash Sale Team
# Description: Automation commands for development and production environments
APP_DEV_NAME=fs_app_dev
APP_PROD_NAME=fs_app_prod

DB_DEV_NAME=fs_pg_dev
DB_PROD_NAME=fs_pg_prod

DB_NAME=db_flash_sale
DB_USER=admin
DB_PASS=QueenSQL

.PHONY: help dev prod build-dev build-prod up-dev up-prod down-dev down-prod logs-dev logs-prod clean clean-all test db-migrate db-seed backup restore

# Default target
.DEFAULT_GOAL := help

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

##@ General

help: ## Display this help message
	@echo "$(BLUE)════════════════════════════════════════════════════════════════$(NC)"
	@echo "$(GREEN)  Flash Sale API - Docker Management Commands$(NC)"
	@echo "$(BLUE)════════════════════════════════════════════════════════════════$(NC)"
	@awk 'BEGIN {FS = ":.*##"; printf "\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  $(YELLOW)%-20s$(NC) %s\n", $$1, $$2 } /^##@/ { printf "\n$(BLUE)%s$(NC)\n", substr($$0, 5) } ' $(MAKEFILE_LIST)
	@echo ""

##@ Development Environment

dev-watch: ## Start development environment (with hot reload)
	@echo "$(GREEN)Starting development environment...$(NC)"
	docker compose -f docker-compose.dev.yml up --remove-orphans --force-recreate
	@echo "$(GREEN)✓ Development environment is running!$(NC)"
	@echo "$(YELLOW)Application: http://localhost:3000$(NC)"
	@echo "$(YELLOW)API Docs: http://localhost:3000/api-docs$(NC)"
	@echo "$(YELLOW)RabbitMQ Management: http://localhost:15672$(NC)"

dev: ## Start development environment (with hot reload)
	@echo "$(GREEN)Starting development environment...$(NC)"
	docker compose -f docker-compose.dev.yml up -d
	@echo "$(GREEN)✓ Development environment is running!$(NC)"
	@echo "$(YELLOW)Application: http://localhost:3000$(NC)"
	@echo "$(YELLOW)API Docs: http://localhost:3000/api-docs$(NC)"
	@echo "$(YELLOW)RabbitMQ Management: http://localhost:15672$(NC)"

dev-build: ## Build and start development environment
	@echo "$(GREEN)Building development environment...$(NC)"
	docker compose -f docker-compose.dev.yml up -d --build --remove-orphans --force-recreate
	@echo "$(GREEN)✓ Development environment built and running!$(NC)"

dev-stop: ## Stop development environment
	@echo "$(YELLOW)Stopping development environment...$(NC)"
	docker compose -f docker-compose.dev.yml stop
	@echo "$(GREEN)✓ Development environment stopped$(NC)"

dev-down: ## Stop and remove development containers
	@echo "$(YELLOW)Removing development environment...$(NC)"
	docker compose -f docker-compose.dev.yml down
	@echo "$(GREEN)✓ Development environment removed$(NC)"

dev-logs: ## View development logs (all services)
	docker compose -f docker-compose.dev.yml logs -f

dev-logs-app: ## View development logs (app only)
	docker compose -f docker-compose.dev.yml logs -f app

dev-restart: ## Restart development environment
	@echo "$(YELLOW)Restarting development environment...$(NC)"
	docker compose -f docker-compose.dev.yml restart
	@echo "$(GREEN)✓ Development environment restarted$(NC)"

dev-shell: ## Access development app container shell
	docker compose -f docker-compose.dev.yml exec app sh

##@ Production Environment

prod: ## Start production environment
	@echo "$(GREEN)Starting production environment...$(NC)"
	docker compose -f docker-compose.prod.yml up -d
	@echo "$(GREEN)✓ Production environment is running!$(NC)"
	@echo "$(YELLOW)Application: http://localhost:3000$(NC)"

prod-build: ## Build and start production environment
	@echo "$(GREEN)Building production environment...$(NC)"
	docker compose -f docker-compose.prod.yml up -d --build --remove-orphans --force-recreate
	@echo "$(GREEN)✓ Production environment built and running!$(NC)"

prod-stop: ## Stop production environment
	@echo "$(YELLOW)Stopping production environment...$(NC)"
	docker compose -f docker-compose.prod.yml stop
	@echo "$(GREEN)✓ Production environment stopped$(NC)"

prod-down: ## Stop and remove production containers
	@echo "$(YELLOW)Removing production environment...$(NC)"
	docker compose -f docker-compose.prod.yml down
	@echo "$(GREEN)✓ Production environment removed$(NC)"

prod-logs: ## View production logs (all services)
	docker compose -f docker-compose.prod.yml logs -f

prod-logs-app: ## View production logs (app only)
	docker compose -f docker-compose.prod.yml logs -f app

prod-restart: ## Restart production environment
	@echo "$(YELLOW)Restarting production environment...$(NC)"
	docker compose -f docker-compose.prod.yml restart
	@echo "$(GREEN)✓ Production environment restarted$(NC)"

prod-shell: ## Access production app container shell
	docker compose -f docker-compose.prod.yml exec app sh

prod-nginx: ## Start production with Nginx
	@echo "$(GREEN)Starting production with Nginx...$(NC)"
	docker compose -f docker-compose.prod.yml --profile with-nginx up -d
	@echo "$(GREEN)✓ Production with Nginx is running!$(NC)"

##@ Database Management (Mode Development)
db-migrate-dev: ## Run database migrations
	@echo "$(GREEN)Running database migrations...$(NC)"
	docker compose -f docker-compose.dev.yml exec $(APP_DEV_NAME) npm run migration:run
	@echo "$(GREEN)✓ Migrations completed$(NC)"

db-migrate-create-dev: ## Create a new migration
	@read -p "Enter migration name: " name; \
	docker compose -f docker-compose.dev.yml exec $(APP_DEV_NAME) npm run migration:create src/database/migrations/$$name

db-migrate-generate-dev: ## Generate migration from schema changes
	@read -p "Enter migration name: " name; \
	docker compose -f docker-compose.dev.yml exec $(APP_DEV_NAME) npm run migration:generate src/database/migrations/$$name

db-revert-dev: ## Revert last migration
	@echo "$(YELLOW)Reverting last migration...$(NC)"
	docker compose -f docker-compose.dev.yml exec $(APP_DEV_NAME) npm run migration:revert
	@echo "$(GREEN)✓ Migration reverted$(NC)"

db-show-dev: ## Show all migrations
	@echo "$(GREEN)Showing migrations...$(NC)"
	docker compose -f docker-compose.dev.yml exec $(APP_DEV_NAME) npm run migration:show

db-seed-dev: ## Seed database with initial data
	@echo "$(GREEN)Seeding database...$(NC)"
	docker compose -f docker-compose.dev.yml exec $(APP_DEV_NAME) npm run seed
	@echo "$(GREEN)✓ Database seeded$(NC)"

db-reset-dev: ## Reset database (drop and recreate)
	@echo "$(RED)⚠ This will delete all data! Are you sure? [y/N]$(NC)" && read ans && [ $${ans:-N} = y ]
	@echo "$(YELLOW)Resetting database...$(NC)"
	docker compose -f docker-compose.dev.yml exec $(APP_DEV_NAME) npm run schema:drop
	docker compose -f docker-compose.dev.yml exec $(APP_DEV_NAME) npm run migration:run
	@echo "$(GREEN)✓ Database reset$(NC)"

db-sync-dev: ## Synchronize database schema (DANGER: only for development)
	@echo "$(RED)⚠ This will sync schema! Are you sure? [y/N]$(NC)" && read ans && [ $${ans:-N} = y ]
	@echo "$(YELLOW)Synchronizing database schema...$(NC)"
	docker compose -f docker-compose.dev.yml exec $(APP_DEV_NAME) npm run schema:sync
	@echo "$(GREEN)✓ Schema synchronized$(NC)"

db-console-dev: ## Access PostgreSQL console
	docker compose -f docker-compose.dev.yml exec $(DB_DEV_NAME) psql -U $(DB_USER) -d $(DB_NAME)

db-backup-dev: ## Backup database
	@echo "$(GREEN)Creating database backup...$(NC)"
	@mkdir -p ./backups
	@docker compose -f docker-compose.dev.yml exec -T $(DB_DEV_NAME) pg_dump -U $(DB_USER) $(DB_NAME) > ./backups/backup_$$(date +%Y%m%d_%H%M%S).sql
	@echo "$(GREEN)✓ Backup created in ./backups/$(NC)"

db-restore-dev: ## Restore database from backup
	@echo "$(YELLOW)Available backups:$(NC)"
	@ls -lh ./backups/
	@read -p "Enter backup filename: " filename; \
	docker compose -f docker-compose.dev.yml exec -T $(DB_DEV_NAME) psql -U $(DB_USER) $(DB_NAME) < ./backups/$$filename
	@echo "$(GREEN)✓ Database restored$(NC)"

##@ Database Management (Mode Production)
db-migrate: ## Run database migrations
	@echo "$(GREEN)Running database migrations...$(NC)"
	docker compose -f docker-compose.dev.yml exec $(APP_PROD_NAME) npm run migration:run
	@echo "$(GREEN)✓ Migrations completed$(NC)"

db-migrate-create: ## Create a new migration
	@read -p "Enter migration name: " name; \
	docker compose -f docker-compose.dev.yml exec $(APP_PROD_NAME) npm run migration:create src/database/migrations/$$name

db-migrate-generate: ## Generate migration from schema changes
	@read -p "Enter migration name: " name; \
	docker compose -f docker-compose.dev.yml exec $(APP_PROD_NAME) npm run migration:generate src/database/migrations/$$name

db-revert: ## Revert last migration
	@echo "$(YELLOW)Reverting last migration...$(NC)"
	docker compose -f docker-compose.dev.yml exec $(APP_PROD_NAME) npm run migration:revert
	@echo "$(GREEN)✓ Migration reverted$(NC)"

db-show: ## Show all migrations
	@echo "$(GREEN)Showing migrations...$(NC)"
	docker compose -f docker-compose.dev.yml exec $(APP_PROD_NAME) npm run migration:show

db-seed: ## Seed database with initial data
	@echo "$(GREEN)Seeding database...$(NC)"
	docker compose -f docker-compose.dev.yml exec $(APP_PROD_NAME) npm run seed
	@echo "$(GREEN)✓ Database seeded$(NC)"

db-reset: ## Reset database (drop and recreate)
	@echo "$(RED)⚠ This will delete all data! Are you sure? [y/N]$(NC)" && read ans && [ $${ans:-N} = y ]
	@echo "$(YELLOW)Resetting database...$(NC)"
	docker compose -f docker-compose.dev.yml exec $(APP_PROD_NAME) npm run schema:drop
	docker compose -f docker-compose.dev.yml exec $(APP_PROD_NAME) npm run migration:run
	@echo "$(GREEN)✓ Database reset$(NC)"

db-sync: ## Synchronize database schema (DANGER: only for development)
	@echo "$(RED)⚠ This will sync schema! Are you sure? [y/N]$(NC)" && read ans && [ $${ans:-N} = y ]
	@echo "$(YELLOW)Synchronizing database schema...$(NC)"
	docker compose -f docker-compose.dev.yml exec $(APP_PROD_NAME) npm run schema:sync
	@echo "$(GREEN)✓ Schema synchronized$(NC)"

db-console: ## Access PostgreSQL console
	docker compose -f docker-compose.dev.yml exec $(DB_PROD_NAME) psql -U $(DB_USER) -d $(DB_NAME)

db-backup: ## Backup database
	@echo "$(GREEN)Creating database backup...$(NC)"
	@mkdir -p ./backups
	@docker compose -f docker-compose.dev.yml exec -T $(DB_PROD_NAME) pg_dump -U $(DB_USER) $(DB_NAME) > ./backups/backup_$$(date +%Y%m%d_%H%M%S).sql
	@echo "$(GREEN)✓ Backup created in ./backups/$(NC)"

db-restore: ## Restore database from backup
	@echo "$(YELLOW)Available backups:$(NC)"
	@ls -lh ./backups/
	@read -p "Enter backup filename: " filename; \
	docker compose -f docker-compose.dev.yml exec -T $(DB_PROD_NAME) psql -U $(DB_USER) $(DB_NAME) < ./backups/$$filename
	@echo "$(GREEN)✓ Database restored$(NC)"

##@ Testing
test: ## Run all tests
	@echo "$(GREEN)Running tests...$(NC)"
	docker compose -f docker-compose.dev.yml exec app npm test

test-unit: ## Run unit tests
	@echo "$(GREEN)Running unit tests...$(NC)"
	docker compose -f docker-compose.dev.yml exec app npm run test:unit

test-integration: ## Run integration tests
	@echo "$(GREEN)Running integration tests...$(NC)"
	docker compose -f docker-compose.dev.yml exec app npm run test:integration

test-coverage: ## Run tests with coverage
	@echo "$(GREEN)Running tests with coverage...$(NC)"
	docker compose -f docker-compose.dev.yml exec app npm run test:coverage

test-watch: ## Run tests in watch mode
	@echo "$(GREEN)Running tests in watch mode...$(NC)"
	docker compose -f docker-compose.dev.yml exec app npm run test:watch

##@ Code Quality

lint: ## Run linter
	@echo "$(GREEN)Running linter...$(NC)"
	docker compose -f docker-compose.dev.yml exec app npm run lint

lint-fix: ## Fix linting errors
	@echo "$(GREEN)Fixing linting errors...$(NC)"
	docker compose -f docker-compose.dev.yml exec app npm run lint:fix

format: ## Format code with Prettier
	@echo "$(GREEN)Formatting code...$(NC)"
	docker compose -f docker-compose.dev.yml exec app npm run format

format-check: ## Check code formatting
	@echo "$(GREEN)Checking code formatting...$(NC)"
	docker compose -f docker-compose.dev.yml exec app npm run format:check

##@ Utilities

ps: ## Show running containers
	@echo "$(BLUE)Development containers:$(NC)"
	@docker compose -f docker-compose.dev.yml ps
	@echo ""
	@echo "$(BLUE)Production containers:$(NC)"
	@docker compose -f docker-compose.prod.yml ps

stats: ## Show container resource usage
	docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"

clean-logs: ## Clean application logs
	@echo "$(YELLOW)Cleaning logs...$(NC)"
	rm -rf ./logs/*
	@echo "$(GREEN)✓ Logs cleaned$(NC)"

clean-cache: ## Clean Redis cache
	@echo "$(YELLOW)Cleaning Redis cache...$(NC)"
	docker-compose -f docker-compose.dev.yml exec redis redis-cli -a redis123 FLUSHALL
	@echo "$(GREEN)✓ Cache cleaned$(NC)"

clean: ## Clean development environment (remove containers and volumes)
	@echo "$(RED)⚠ This will remove all containers and volumes! Are you sure? [y/N]$(NC)" && read ans && [ $${ans:-N} = y ]
	@echo "$(YELLOW)Cleaning development environment...$(NC)"
	docker compose -f docker-compose.dev.yml down -v
	@echo "$(GREEN)✓ Development environment cleaned$(NC)"

clean-prod: ## Clean production environment (remove containers and volumes)
	@echo "$(RED)⚠ This will remove all production containers and volumes! Are you sure? [y/N]$(NC)" && read ans && [ $${ans:-N} = y ]
	@echo "$(YELLOW)Cleaning production environment...$(NC)"
	docker compose -f docker-compose.prod.yml down -v
	@echo "$(GREEN)✓ Production environment cleaned$(NC)"

clean-all: ## Clean everything (dev + prod + docker system)
	@echo "$(RED)⚠ This will remove EVERYTHING! Are you sure? [y/N]$(NC)" && read ans && [ $${ans:-N} = y ]
	@echo "$(YELLOW)Cleaning all environments...$(NC)"
	docker compose -f docker-compose.dev.yml down -v
	docker compose -f docker-compose.prod.yml down -v
	docker system prune -af --volumes
	@echo "$(GREEN)✓ Everything cleaned$(NC)"

rebuild-dev: clean-all dev-build ## Full rebuild of development environment

rebuild-prod: clean-prod prod-build ## Full rebuild of production environment

##@ Monitoring

health: ## Check health of all services
	@echo "$(BLUE)Checking service health...$(NC)"
	@curl -s http://localhost:3000/health | jq '.' || echo "$(RED)API not responding$(NC)"
	@echo ""
	@docker compose -f docker-compose.dev.yml exec postgres pg_isready -U postgres && echo "$(GREEN)✓ PostgreSQL is healthy$(NC)" || echo "$(RED)✗ PostgreSQL is down$(NC)"
	@docker compose -f docker-compose.dev.yml exec redis redis-cli -a redis123 ping && echo "$(GREEN)✓ Redis is healthy$(NC)" || echo "$(RED)✗ Redis is down$(NC)"
	@docker-compose -f docker-compose.dev.yml exec rabbitmq rabbitmq-diagnostics -q ping && echo "$(GREEN)✓ RabbitMQ is healthy$(NC)" || echo "$(RED)✗ RabbitMQ is down$(NC)"

monitor: ## Monitor logs in real-time
	@echo "$(GREEN)Monitoring all services...$(NC)"
	docker compose -f docker-compose.dev.yml logs -f --tail=100

redis-cli: ## Access Redis CLI
	docker compose -f docker-compose.dev.yml exec redis redis-cli -a redis123

rabbitmq-status: ## Check RabbitMQ status
	docker compose -f docker-compose.dev.yml exec rabbitmq rabbitmqctl status

##@ Information

info: ## Display environment information
	@echo "$(BLUE)════════════════════════════════════════════════════════════════$(NC)"
	@echo "$(GREEN)  Flash Sale API - Environment Information$(NC)"
	@echo "$(BLUE)════════════════════════════════════════════════════════════════$(NC)"
	@echo "$(YELLOW)Docker version:$(NC)"
	@docker --version
	@echo "$(YELLOW)Docker Compose version:$(NC)"
	@docker-compose --version
	@echo "$(YELLOW)Node version (in container):$(NC)"
	@docker-compose -f docker-compose.dev.yml exec app node --version 2>/dev/null || echo "Container not running"
	@echo "$(YELLOW)npm version (in container):$(NC)"
	@docker-compose -f docker-compose.dev.yml exec app npm --version 2>/dev/null || echo "Container not running"
	@echo "$(BLUE)════════════════════════════════════════════════════════════════$(NC)"

version: ## Show application version
	@docker compose -f docker-compose.dev.yml exec app cat package.json | jq -r '.version' 2>/dev/null || echo "Container not running"
