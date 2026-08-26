#!/bin/bash
# LedgerFlow Docker Entrypoint
# Starts cron daemon and Evidence.dev server

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

# Start Evidence.dev server in background
echo "🌐 Starting Evidence.dev dashboard on port ${PORT:-3000}..."
cd /app/evidence
npx evidence serve --port "${PORT:-3000}" --host 0.0.0.0 &

EVIDENCE_PID=$!

# Function to handle shutdown
shutdown() {
    echo "🛑 Shutting down..."
    kill $EVIDENCE_PID 2>/dev/null || true
    wait $EVIDENCE_PID 2>/dev/null || true
    exit 0
}

trap shutdown SIGTERM SIGINT

# Start cron in foreground (this is the main process)
echo "⏰ Starting cron daemon..."
exec cron -f -L 15