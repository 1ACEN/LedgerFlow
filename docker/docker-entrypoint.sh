#!/bin/bash
# LedgerFlow Docker Entrypoint
# Initializes the ledger, then starts cron + the unified FastAPI dashboard

set -euo pipefail

echo "🚀 Starting LedgerFlow container..."

# Initialize database if not exists
if [ ! -f "$DUCKDB_PATH" ]; then
    echo "📊 Initializing DuckDB schema..."
    python scripts/db/init_db.py --db "$DUCKDB_PATH"
fi

# Generate synthetic data in dev mode (if no real data)
if [ "${GENERATE_SYNTHETIC:-false}" = "true" ] && [ ! -f "$DUCKDB_PATH" ]; then
    echo "🎲 Generating synthetic data..."
    python scripts/utils/generate_synthetic.py --rows 50000 --output "$DUCKDB_PATH"
fi

# Train models if not exist
if [ ! -f "$MODEL_REGISTRY_PATH/cash_forecast.joblib" ] || [ ! -f "$MODEL_REGISTRY_PATH/decline_retry.joblib" ]; then
    echo "🤖 Training ML models..."
    python scripts/ml/train_forecast.py --db "$DUCKDB_PATH" --output "$MODEL_REGISTRY_PATH/cash_forecast.joblib"
    python scripts/ml/train_retry.py --db "$DUCKDB_PATH" --output "$MODEL_REGISTRY_PATH/decline_retry.joblib"
fi

# Generate forecast predictions so the dashboard has data on first boot
if [ -f "$MODEL_REGISTRY_PATH/cash_forecast.joblib" ]; then
    echo "🔮 Generating cash flow forecast predictions..."
    python scripts/ml/predict_cashflow.py --db "$DUCKDB_PATH" --model "$MODEL_REGISTRY_PATH/cash_forecast.joblib"
fi

# Start cron daemon in background (nightly ingest / reconciliation / retraining)
echo "⏰ Starting cron daemon..."
cron

# Start the unified FastAPI dashboard as the main process
echo "🌐 Starting LedgerFlow unified dashboard on port ${WEBHOOK_PORT:-8080}..."
exec uvicorn scripts.api.webhooks:app --host 0.0.0.0 --port "${WEBHOOK_PORT:-8080}"