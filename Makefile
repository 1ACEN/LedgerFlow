# LedgerFlow Makefile
# One-command dev, test, build, deploy

.PHONY: help dev live dev-full seed generate-data train test lint typecheck build deploy clean

# Default target
help:
	@echo "LedgerFlow — Financial Observability Platform"
	@echo ""
	@echo "Usage:"
	@echo "  make dev            Start local dev environment (Evidence + DuckDB)"
	@echo "  make generate-data  Generate synthetic transaction data"
	@echo "  make train          Train ML models (forecast + retry)"
	@echo "  make test           Run all tests"
	@echo "  make lint           Lint Python, JS, SQL"
	@echo "  make typecheck      Type check Python + TypeScript"
	@echo "  make build          Build Docker image"
	@echo "  make deploy         Deploy to Fly.io"
	@echo "  make clean          Remove generated files"

# =============================================================================
# DEVELOPMENT
# =============================================================================

dev: generate-data
	@echo "Starting Evidence.dev dashboard on http://localhost:3000"
	@echo "Press Ctrl+C to stop"
	cd evidence && npm run dev

# Start the FastAPI live-input + webhook server (DEMO_MODE=true by default)
live:
	@echo "Starting LedgerFlow Live API on http://localhost:8080"
	@echo "  Live Input UI: http://localhost:8080/"
	@echo "  API Docs:      http://localhost:8080/docs"
	@echo "  Demo stream:   ON (synthetic txns every 4s)"
	@if not exist .env copy .env.example .env
	uv run uvicorn scripts.api.webhooks:app --host 0.0.0.0 --port 8080 --reload

# Start BOTH Evidence dashboard AND FastAPI live API (requires two terminals or a process manager)
dev-full:
	@echo "Starting full LedgerFlow stack..."
	@echo "  Dashboard:   http://localhost:3000"
	@echo "  Live API:    http://localhost:8080"
	@if not exist .env copy .env.example .env
	@start "LedgerFlow API" cmd /k uv run uvicorn scripts.api.webhooks:app --port 8080 --reload
	cd evidence && npm run dev

# Seed (or re-seed) the DuckDB with synthetic data
seed:
	@echo "Seeding LedgerFlow DuckDB with synthetic data..."
	uv run python scripts/utils/generate_synthetic.py --rows 50000 --output data/ledgerflow.duckdb

# Generate synthetic data for local development
generate-data:
	@echo "Generating synthetic transaction data..."
	uv run python scripts/utils/generate_synthetic.py --rows 50000 --output data/ledgerflow.duckdb

# Train ML models
train:
	@echo "Training cash flow forecast model (quantile regression)..."
	uv run python scripts/ml/train_forecast.py --db data/ledgerflow.duckdb --output models/cash_forecast.joblib
	@echo "Training decline retry advisor model..."
	uv run python scripts/ml/train_retry.py --db data/ledgerflow.duckdb --output models/decline_retry.joblib

# =============================================================================
# TESTING & QUALITY
# =============================================================================

test: test-python test-js

test-python:
	@echo "Running Python tests..."
	uv run pytest tests/unit tests/integration -v --tb=short

test-js:
	@echo "Running JavaScript tests..."
	cd evidence && npm test

lint: lint-python lint-js lint-sql

lint-python:
	@echo "Linting Python..."
	uv run ruff check scripts/ tests/
	uv run ruff format --check scripts/ tests/


lint-js:
	@echo "Linting JavaScript/TypeScript..."
	cd evidence && npm run lint

lint-sql:
	@echo "Linting SQL..."
	uv run sqlfluff lint evidence/sources/

typecheck: typecheck-python typecheck-js

typecheck-python:
	@echo "Type checking Python..."
	uv run mypy scripts/db/ scripts/ingestion/ scripts/ml/ scripts/utils/

typecheck-js:
	@echo "Type checking TypeScript..."
	cd evidence && npm run typecheck

# =============================================================================
# BUILD & DEPLOY
# =============================================================================

build:
	@echo "Building Docker image..."
	docker build -t ledgerflow:latest -f docker/Dockerfile .

# Deploy to Fly.io
deploy:
	@echo "Deploying to Fly.io..."
	fly deploy --config fly.toml

# Deploy with specific environment
deploy-staging:
	fly deploy --config fly.staging.toml

deploy-prod:
	fly deploy --config fly.prod.toml

# =============================================================================
# DATABASE & MIGRATIONS
# =============================================================================

db-init:
	@echo "Initializing DuckDB schema..."
	uv run python scripts/db/init_db.py --db data/ledgerflow.duckdb

db-migrate:
	@echo "Running migrations..."
	uv run python scripts/db/migrate.py --db data/ledgerflow.duckdb

db-reconcile:
	@echo "Running nightly reconciliation..."
	uv run python scripts/ingestion/reconcile.py --db data/ledgerflow.duckdb

# =============================================================================
# UTILITIES
# =============================================================================

clean:
	@echo "Cleaning generated files..."
	rm -rf data/ledgerflow.duckdb
	rm -rf models/*.joblib
	rm -rf evidence/build
	rm -rf .pytest_cache
	rm -rf __pycache__
	rm -rf scripts/__pycache__
	rm -rf tests/__pycache__

install: install-python install-js

install-python:
	@echo "Installing Python dependencies..."
	uv sync --dev

install-js:
	@echo "Installing Node dependencies..."
	cd evidence && npm ci

# Quick aliases
up: dev
down:
	@pkill -f "npm run dev" || true
	@pkill -f "evidence" || true

logs:
	fly logs -a ledgerflow

ssh:
	fly ssh console -a ledgerflow

status:
	fly status -a ledgerflow