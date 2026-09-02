# LedgerFlow Dockerfile
# Multi-stage build: builder → runtime
# Runs the unified LedgerFlow dashboard (FastAPI) + Python ingestion/ML cron jobs

# =============================================================================
# STAGE 1: Python builder (compile wheels, install deps)
# =============================================================================
FROM python:3.11-slim AS python-builder

WORKDIR /app
COPY pyproject.toml ./
RUN pip install --no-cache-dir --upgrade pip uv && \
    uv pip install --system --no-cache -r pyproject.toml


# =============================================================================
# STAGE 2: Runtime
# =============================================================================
FROM python:3.11-slim AS runtime

# System deps for DuckDB, LightGBM, and cron
RUN apt-get update && apt-get install -y --no-install-recommends \
    cron \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -r ledgerflow && useradd -r -g ledgerflow -d /app -s /bin/bash ledgerflow

WORKDIR /app

# Copy Python deps from builder
COPY --from=python-builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=python-builder /usr/local/bin/uv /usr/local/bin/uv

# Copy application code
COPY scripts/ ./scripts/

# Create directories for persistent data
RUN mkdir -p /data /models /var/log/ledgerflow && \
    chown -R ledgerflow:ledgerflow /app /data /models /var/log/ledgerflow

# Copy entrypoint and cron config
COPY docker/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

COPY docker/crontab /etc/cron.d/ledgerflow
RUN chmod 0644 /etc/cron.d/ledgerflow && crontab /etc/cron.d/ledgerflow

# Environment
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    DUCKDB_PATH=/data/ledgerflow.duckdb \
    MODEL_REGISTRY_PATH=/models/ \
    WEBHOOK_PORT=8080

USER ledgerflow

EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

ENTRYPOINT ["/docker-entrypoint.sh"]