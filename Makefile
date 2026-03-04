.PHONY: help up down build logs proto proto-go proto-frontend clean dev-backend dev-frontend

# Default target
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ─── Docker ───────────────────────────────────────────────────────────
up: ## Start all services (build if needed)
	docker compose up --build -d
	@echo ""
	@echo "✅ Złota Rybka is starting up!"
	@echo "   Frontend:  http://localhost:3000"
	@echo "   Backend:   http://localhost:8080"
	@echo "   Envoy:     http://localhost:9090"
	@echo "   Database:  localhost:5432"

up-dev: ## Start services in foreground (dev mode)
	docker compose up --build

down: ## Stop all services
	docker compose down

down-clean: ## Stop all services and remove volumes
	docker compose down -v

build: ## Build Docker images
	docker compose build

logs: ## View logs (all services)
	docker compose logs -f

logs-backend: ## View backend logs
	docker compose logs -f backend

logs-frontend: ## View frontend logs
	docker compose logs -f frontend

ps: ## Show running containers
	docker compose ps

# ─── Proto Generation ─────────────────────────────────────────────────
proto-go: ## Generate Go protobuf code
	cd backend && buf generate

proto-frontend: ## Generate TypeScript protobuf code
	cd frontend && buf generate

proto: proto-go proto-frontend ## Generate all protobuf code

# ─── Go Backend (local development) ──────────────────────────────────
dev-backend: ## Run backend locally (requires PostgreSQL on localhost)
	cd backend && go run ./cmd/server

backend-tidy: ## Tidy Go modules
	cd backend && go mod tidy

backend-test: ## Run backend tests
	cd backend && go test ./...

# ─── Frontend (local development) ────────────────────────────────────
install-frontend: ## Install frontend dependencies
	cd frontend && bun install

dev-frontend: ## Run frontend locally
	cd frontend && bun run dev

build-frontend: ## Build frontend for production
	cd frontend && bun run build

# ─── Database ────────────────────────────────────────────────────────
db-connect: ## Connect to PostgreSQL
	docker exec -it zlota-rybka-db psql -U postgres -d golden_fish

db-reset: ## Reset database (WARNING: drops all data)
	docker compose down -v postgres
	docker compose up -d postgres

# ─── Utilities ───────────────────────────────────────────────────────
health: ## Check backend health
	curl -s http://localhost:8080/grpc.health.v1.Health/Check | jq . || \
	  echo "Backend not responding"

clean: ## Remove build artifacts
	cd backend && rm -rf gen/
	cd frontend && rm -rf .next/ src/gen/ node_modules/.cache/

setup: ## Initial project setup
	@echo "Installing buf..."
	@which buf || (echo "Please install buf: https://buf.build/docs/installation" && exit 1)
	@echo "Installing frontend dependencies..."
	cd frontend && bun install
	@echo "Generating proto files..."
	$(MAKE) proto
	@echo ""
	@echo "✅ Setup complete! Run 'make up' to start the application."
