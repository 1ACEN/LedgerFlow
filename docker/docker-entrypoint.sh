#!/bin/bash
# LedgerFlow Docker Entrypoint
# Initializes PostgreSQL schema/seed safely, then starts cron + unified FastAPI dashboard

set -e

echo "Starting LedgerFlow container..."

# Ensure model directories exist
mkdir -p "${MODEL_REGISTRY_PATH:-/models/}" 2>/dev/null || true

# Copy fallback pre-trained models if destination is empty
if [ -d "/app/models" ] && [ ! -f "${MODEL_REGISTRY_PATH:-/models/}/cash_forecast.joblib" ]; then
    echo "Copying pre-trained model bundle..."
    cp -r /app/models/* "${MODEL_REGISTRY_PATH:-/models/}/" 2>/dev/null || true
fi

# Wait briefly for PostgreSQL if DATABASE_URL is configured
if [ -n "$DATABASE_URL" ]; then
    echo "Initializing PostgreSQL schema & running migrations..."
    python -m scripts.db.init_db || true
    python -m scripts.db.migrate || true

    # Only seed synthetic transactions when database is completely empty
    if [ "${GENERATE_SYNTHETIC:-true}" = "true" ]; then
        TXN_COUNT=$(python -c "from scripts.db.connection import open_direct_conn; c=open_direct_conn(); print(c.execute('SELECT COUNT(*) FROM transactions').fetchone()[0]); c.close()" 2>/dev/null || echo "0")
        if [ "${TXN_COUNT:-0}" = "0" ]; then
            echo "Transactions table is empty — generating initial seed transactions..."
            python -m scripts.utils.generate_synthetic --rows 2000 || true
        else
            echo "PostgreSQL already contains ${TXN_COUNT} transactions — skipping synthetic seed."
        fi
    fi

    # Generate forecast predictions if models exist (non-blocking)
    if [ -f "${MODEL_REGISTRY_PATH:-/models/}/cash_forecast.joblib" ]; then
        echo "Generating cash flow forecast predictions..."
        python -m scripts.ml.predict_cashflow --model "${MODEL_REGISTRY_PATH:-/models/}/cash_forecast.joblib" || true
    fi
else
    echo "WARNING: DATABASE_URL is not set. Skipping startup DB initialization."
fi

# Start cron daemon in background if root/permitted
cron 2>/dev/null || true

# Determine port (Render dynamically sets PORT, local/Fly uses WEBHOOK_PORT or 8080)
APP_PORT="${PORT:-${WEBHOOK_PORT:-8080}}"

# Start the unified FastAPI dashboard as the main process
echo "Starting LedgerFlow unified dashboard on port ${APP_PORT}..."
exec python -m uvicorn scripts.api.webhooks:app --host 0.0.0.0 --port "${APP_PORT}"
