# LedgerFlow Dockerfile
# Multi-stage build: builder → runtime
# Runs Evidence.dev dashboard + Python ingestion/ML cron jobs

# =============================================================================
# STAGE 1: Builder (Node for Evidence, Python for deps)
# =============================================================================
FROM node:20-alpine AS node-builder

WORKDIR /app/evidence
COPY evidence/package*.json ./
RUN npm ci --prefer-offline --no-audit --progress=false

COPY evidence/ .
RUN npm run build


# =============================================================================
# STAGE 2: Python builder (compile wheels, install deps)
# =============================================================================
FROM python:3.11-slim AS python-builder

WORKDIR /app
COPY pyproject.toml ./
RUN pip install --no-cache-dir --upgrade pip uv && \
    uv pip install --system --no-cache -r pyproject.toml


# =============================================================================
# STAGE 3: Runtime
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
COPY evidence/sources/ ./evidence/sources/
COPY --from=node-builder /app/evidence/build ./evidence/build
COPY --from=node-builder /app/evidence/node_modules ./evidence/node_modules
COPY --from=node-builder /app/evidence/package.json ./evidence/package.json

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
    EVIDENCE_BUILD_PATH=/app/evidence/build \
    PORT=3000 \
    WEBHOOK_PORT=8080

USER ledgerflow

EXPOSE 3000 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["cron", "-f"]