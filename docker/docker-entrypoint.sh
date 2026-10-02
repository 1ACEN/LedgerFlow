#!/bin/bash
# LedgerFlow Docker Entrypoint
# Initializes the ledger, then starts cron + the unified FastAPI dashboard

set -e

echo "🚀 Starting LedgerFlow container..."

# Ensure target directories exist
mkdir -p "$(dirname "$DUCKDB_PATH")" "${MODEL_REGISTRY_PATH:-/models/}" 2>/dev/null || true

# Copy fallback pre-trained models if destination is empty
if [ -d "/app/models" ] && [ ! -f "${MODEL_REGISTRY_PATH:-/models/}/cash_forecast.joblib" ]; then
    echo "📦 Copying pre-trained model bundle..."
    cp -r /app/models/* "${MODEL_REGISTRY_PATH:-/models/}/" 2>/dev/null || true
fi

# Initialize database schema if not exists
if [ ! -f "$DUCKDB_PATH" ]; then
    echo "📊 Initializing DuckDB schema..."
    python scripts/db/init_db.py --db "$DUCKDB_PATH" || true

    # Generate synthetic data for demo / exploration (lightweight 2000 rows for fast startup)
    if [ "${GENERATE_SYNTHETIC:-true}" = "true" ]; then
        echo "🎲 Generating seed transactions..."
        python scripts/utils/generate_synthetic.py --rows 2000 --output "$DUCKDB_PATH" || true
    fi
fi

# Generate forecast predictions if models exist (non-blocking)
if [ -f "${MODEL_REGISTRY_PATH:-/models/}/cash_forecast.joblib" ] && [ -f "$DUCKDB_PATH" ]; then
    echo "🔮 Generating cash flow forecast predictions..."
    python scripts/ml/predict_cashflow.py --db "$DUCKDB_PATH" --model "${MODEL_REGISTRY_PATH:-/models/}/cash_forecast.joblib" || true
fi

# Start cron daemon in background if root/permitted
cron 2>/dev/null || true

# Determine port (Render dynamically sets PORT, local/Fly uses WEBHOOK_PORT or 8080)
APP_PORT="${PORT:-${WEBHOOK_PORT:-8080}}"

# Start the unified FastAPI dashboard as the main process
echo "🌐 Starting LedgerFlow unified dashboard on port ${APP_PORT}..."
exec python -m uvicorn scripts.api.webhooks:app --host 0.0.0.0 --port "${APP_PORT}"