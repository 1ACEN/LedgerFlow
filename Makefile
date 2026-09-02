# LedgerFlow Makefile
# One-command dev, test, build, deploy

.PHONY: help dev live seed generate-data train test lint typecheck build deploy clean

# Default target
help:
	@echo "LedgerFlow — Financial Observability Platform"
	@echo ""
	@echo "Usage:"
	@echo "  make dev            Start the unified dashboard on http://localhost:8080"
	@echo "  make generate-data  Generate synthetic transaction data"
	@echo "  make train          Train ML models (forecast + retry)"
	@echo "  make test           Run Python tests"
	@echo "  make lint           Lint Python"
	@echo "  make typecheck      Type check Python"
	@echo "  make build          Build Docker image"
	@echo "  make deploy         Deploy to Fly.io"
	@echo "  make clean          Remove generated files"

# =============================================================================
# DEVELOPMENT
# =============================================================================

# Start the unified dashboard (single merged FastAPI app on port 8080)
dev: generate-data
	@echo "Starting LedgerFlow dashboard on http://localhost:8080"
	@echo "Press Ctrl+C to stop"
	@if not exist .env copy .env.example .env
	uv run uvicorn scripts.api.webhooks:app --host 0.0.0.0 --port 8080 --reload

# Alias for make dev
live: dev

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

test: test-python

test-python:
	@echo "Running Python tests..."
	uv run pytest tests/unit tests/integration -v --tb=short

lint:
	@echo "Linting Python..."
	uv run ruff check scripts/ tests/
	uv run ruff format --check scripts/ tests/

typecheck:
	@echo "Type checking Python..."
	uv run mypy scripts/db/ scripts/ingestion/ scripts/ml/ scripts/utils/

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
	rm -rf .pytest_cache
	rm -rf __pycache__
	rm -rf scripts/__pycache__
	rm -rf tests/__pycache__

install:
	@echo "Installing Python dependencies..."
	uv sync --dev

# Quick aliases
up: dev
down:
	@pkill -f "scripts.api.webhooks" || true
	@pkill -f "uvicorn" || true

logs:
	fly logs -a ledgerflow

ssh:
	fly ssh console -a ledgerflow

status:
	fly status -a ledgerflow