# LedgerFlow

> **Financial observability for modern finance teams** — unified payment operations, ML-powered cash forecasting, and FP&A views on a single transaction ledger.

[![CI](https://github.com/yourusername/ledgerflow/actions/workflows/ci.yml/badge.svg)](https://github.com/yourusername/ledgerflow/actions/workflows/ci.yml)
[![Deploy](https://github.com/yourusername/ledgerflow/actions/workflows/deploy.yml/badge.svg)](https://github.com/yourusername/ledgerflow/actions/workflows/deploy.yml)
[![Python 3.11+](https://img.shields.io/badge/python-3.11%2B-blue.svg)](https://www.python.org/downloads/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## What it does

LedgerFlow ingests transactions from Stripe and bank feeds (via Plaid), normalises them into a unified ledger in DuckDB, and serves three Evidence.dev dashboards tailored to each finance audience:

| Layer | Capability |
|---|---|
| **Ingestion** | Stripe webhooks + Plaid bank feeds → normalised transaction ledger |
| **Fintech Ops** | Real-time payment success rates, decline-code analysis, payout tracking, dispute monitoring |
| **Cash Flow** | Daily net position, 13-week forecast with ML prediction intervals (P10/P50/P90), collections ageing |
| **CFO / FP&A** | Monthly P&L, variance vs. budget, burn rate, runway, and revenue waterfall |
| **ML** | LightGBM quantile regression for cash forecasting; XGBoost decline-retry advisor |
| **Deploy** | Single-container Fly.io deployment with persistent volume, cron jobs, and secrets management |

---

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐     ┌──────────────────┐
│  Stripe     │     │              │     │   DuckDB /      │     │  Evidence.dev    │
│  Webhooks   │────▶│  Ingestion   │────▶│   Postgres      │────▶│  Dashboards      │
│  Plaid Feeds│     │  (Python)    │     │   (Ledger)      │     │  (Static Site)   │
└─────────────┘     └──────────────┘     └────────┬────────┘     └──────────────────┘
                                                  │
                    ┌─────────────────────────────┼─────────────────────────────┐
                    ▼                             ▼                             ▼
           ┌─────────────────┐           ┌─────────────────┐           ┌─────────────────┐
           │  /ops           │           │   /cashflow     │           │    /cfo         │
           │  Fintech Ops    │           │  ML Forecast    │           │  FP&A Views     │
           │  (Real-time)    │           │  (Daily cron)   │           │  (Monthly)      │
           └─────────────────┘           └─────────────────┘           └─────────────────┘
```

**Key design decisions:**
- **DuckDB** — embedded OLAP engine; no separate database server required locally
- **Polars** — fast in-process DataFrame transforms before writing to DuckDB
- **Evidence.dev** — SQL-driven dashboards that compile to a static site (zero runtime overhead)
- **uv** — fast, reproducible Python dependency management

---

## Quick Start

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Python | 3.11+ | Ingestion, ML, scripts |
| Node.js | 20+ | Evidence.dev dashboards |
| uv | latest | Python package manager (`curl -LsSf https://astral.sh/uv/install.sh \| sh`) |
| Docker | any | Production image |
| flyctl | latest | Fly.io deployment |

### 1. Clone and install

```bash
git clone https://github.com/yourusername/ledgerflow.git
cd ledgerflow

# Install Python + Node dependencies
make install
```

### 2. Configure environment

```bash
cp .env.example .env
# No API keys needed for local development — synthetic data is used by default
```

### 3. Start the dev environment

```bash
# Generates 50k synthetic transactions, then starts the dashboard
make dev
```

Opens **Evidence.dev** at `http://localhost:3000` with hot-reload enabled.

### 4. (Optional) Train ML models

```bash
make train
# Outputs: models/cash_forecast.joblib, models/decline_retry.joblib
```

---

## All `make` commands

```bash
make help            # Show this list

# Development
make dev             # Generate data + start Evidence dashboard (port 3000)
make generate-data   # Generate 50k synthetic transactions into DuckDB
make train           # Train both ML models

# Testing & quality
make test            # Run all Python + JS tests
make test-python     # pytest (unit + integration)
make test-js         # vitest (Evidence components)
make lint            # Ruff + ESLint + SQLFluff
make typecheck       # mypy + tsc

# Database
make db-init         # Initialise DuckDB schema
make db-migrate      # Run schema migrations
make db-reconcile    # Run nightly reconciliation manually

# Build & deploy
make build           # Build Docker image
make deploy          # Deploy to Fly.io (fly.toml)
make deploy-staging  # Deploy using staging config
make deploy-prod     # Deploy using production config

# Utilities
make up              # Alias for make dev
make down            # Stop dev server
make logs            # Stream Fly.io logs
make ssh             # SSH into Fly.io VM
make status          # Check Fly.io app status
make clean           # Remove generated data, models, and build artifacts
```

---

## Deployment (Fly.io)

```bash
# First-time setup
fly auth login
fly launch --name ledgerflow --region iad --no-deploy

# Set production secrets (never in .env for prod)
fly secrets set \
  STRIPE_SECRET_KEY=sk_live_... \
  STRIPE_WEBHOOK_SECRET=whsec_... \
  PLAID_CLIENT_ID=... \
  PLAID_SECRET=...

# Deploy
make deploy
```

**What gets provisioned:**

| Resource | Details |
|----------|---------|
| VM | 1× shared-cpu-1x, 256 MB RAM (auto-scales) |
| Volume | 10 GB persistent at `/data` (DuckDB + model artifacts) |
| PostgreSQL | Optional upgrade from DuckDB for multi-tenant scale |
| Cron — ingest | Nightly Stripe + Plaid pull |
| Cron — retrain | Weekly ML model retrain |
| TLS | `fly certs add yourdomain.com` |

---

## Testing

```bash
make test          # Unit + integration tests (pytest + vitest)
make lint          # Ruff + ESLint + SQLFluff
make typecheck     # mypy + tsc
```

---

## Project Structure

```
ledgerflow/
├── .github/workflows/        # CI (test, lint, typecheck) + CD (deploy)
├── docker/
│   ├── Dockerfile            # Multi-stage: builder → slim runtime
│   └── docker-entrypoint.sh
├── evidence/                 # Evidence.dev dashboard app
│   ├── sources/              # SQL source definitions (DuckDB)
│   ├── pages/                # Markdown dashboard pages (/ops, /cashflow, /cfo)
│   └── components/           # Custom Svelte/React components
├── scripts/
│   ├── generate_synthetic.py # Synthetic data generator (50k+ transactions)
│   ├── init_db.py            # Schema initialisation
│   ├── migrate.py            # Schema migrations
│   ├── ingest_stripe.py      # Stripe webhook ingestion
│   ├── ingest_plaid.py       # Plaid bank feed ingestion
│   ├── reconcile.py          # Nightly reconciliation
│   ├── train_forecast.py     # Cash flow ML training
│   ├── train_retry.py        # Decline-retry ML training
│   ├── predict_cashflow.py   # Batch cash flow inference
│   └── health_check.py       # Readiness / liveness probe
├── models/                   # Trained .joblib artifacts (gitignored)
├── data/                     # DuckDB file (gitignored)
├── tests/
│   ├── unit/
│   └── integration/
├── pyproject.toml            # Python deps + tool config (uv / ruff / mypy)
├── fly.toml                  # Fly.io deployment config
├── Makefile                  # All dev, test, build, deploy commands
└── .env.example              # Environment variable reference
```

---

## Environment Variables

Copy `.env.example` → `.env` for local development. No API keys are required when running with synthetic data.

| Variable | Required | Description |
|----------|----------|-------------|
| `STRIPE_SECRET_KEY` | Prod only | `sk_test_...` for development, `sk_live_...` for production |
| `STRIPE_WEBHOOK_SECRET` | Prod only | `whsec_...` from Stripe dashboard |
| `STRIPE_ACCOUNT_ID` | Prod only | Your Stripe account ID (Stripe Connect) |
| `PLAID_CLIENT_ID` | Prod only | Plaid client ID |
| `PLAID_SECRET` | Prod only | Plaid secret key |
| `PLAID_ENV` | Prod only | `sandbox` \| `development` \| `production` |
| `PLAID_ACCESS_TOKENS` | Prod only | Comma-separated access tokens from the Link flow |
| `DATABASE_URL` | Prod only | PostgreSQL connection string (Fly Postgres) |
| `DUCKDB_PATH` | Local | DuckDB file path (default: `data/ledgerflow.duckdb`) |
| `MODEL_REGISTRY_PATH` | All | Directory for trained model artifacts (default: `models/`) |
| `GENERATE_SYNTHETIC` | Dev only | Auto-generate data on container start (`true`/`false`) |
| `SENTRY_DSN` | Optional | Sentry error-tracking DSN |
| `SLACK_WEBHOOK_URL` | Optional | Slack webhook URL for operational alerts |
| `LOG_LEVEL` | All | Logging verbosity (`DEBUG`, `INFO`, `WARNING`) |

> **Never commit `.env` to version control.** Use `fly secrets set` for production credentials.

---

## Dashboard Pages

| Route | Audience | Data freshness |
|-------|----------|----------------|
| `/ops` | Payments engineers, risk team | Real-time (webhook-driven) |
| `/cashflow` | Treasurer, controller | Daily (nightly cron) |
| `/cfo` | CFO, CEO, board | Monthly (manual refresh) |

---

## ML Models

| Model | Algorithm | Prediction target | Key features |
|-------|-----------|-------------------|--------------|
| `cash_forecast` | LightGBM Quantile Regression | Days until payment (P10 / P50 / P90) | Vendor/customer history, invoice amount, day-of-week, month, ageing bucket |
| `decline_retry` | XGBoost Binary Classification | `succeeded_on_retry_7d` | Decline code, card brand/funding type, amount, hour-of-day, customer retry history |

- Retrained **weekly** via Fly.io cron
- Cash forecast inference runs **daily** after nightly ingest
- Decline advisor runs **real-time** per transaction event

---

## Resume Bullet

> **LedgerFlow** — *Python · DuckDB · Polars · Evidence.dev · LightGBM · XGBoost · Fly.io · GitHub Actions*
> Built a deployable financial observability platform ingesting Stripe + Plaid bank feeds into a unified ledger; shipped real-time payments ops dashboard, 13-week ML cash forecast with prediction intervals (quantile regression), and CFO variance views; automated nightly reconciliation and weekly model retraining via CI/CD on Fly.io.

---

## Roadmap

- [ ] Multi-tenant support (row-level security)
- [ ] ERP integrations (NetSuite, QuickBooks Online)
- [ ] Anomaly detection on transaction volume (Isolation Forest)
- [ ] Dispute / fraud prediction pre-authorisation
- [ ] Embeddable custom React frontend (replacing Evidence.dev)
- [ ] Kubernetes Helm chart for on-prem deployment

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

## Author

[Your Name](https://github.com/yourusername) · [LinkedIn](https://linkedin.com/in/yourprofile) · [Email](mailto:you@example.com)