# LedgerFlow

> **Financial observability for modern finance teams** — unified payment operations, ML-powered cash forecasting, and FP&A views in a single live dashboard.

[![CI](https://github.com/yourusername/ledgerflow/actions/workflows/ci.yml/badge.svg)](https://github.com/yourusername/ledgerflow/actions/workflows/ci.yml)
[![Deploy](https://github.com/yourusername/ledgerflow/actions/workflows/deploy.yml/badge.svg)](https://github.com/yourusername/ledgerflow/actions/workflows/deploy.yml)
[![Python 3.11+](https://img.shields.io/badge/python-3.11%2B-blue.svg)](https://www.python.org/downloads/)
[![React 18](https://img.shields.io/badge/react-18-61dafb.svg?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/typescript-5-3178c6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## What it does

LedgerFlow ingests transactions from Stripe and bank feeds (via Plaid), normalises them into a unified ledger in DuckDB, and serves **one unified FastAPI dashboard** combining live streaming with the full BI suite:

| Layer | Capability |
|---|---|
| **Ingestion** | Stripe webhooks + Plaid bank feeds → normalised transaction ledger |
| **Live Pipeline** | Real-time streaming feed, manual transaction entry, gateway/webhook health |
| **Fintech Ops** | Payment success rates, decline-code analysis, AI retry advisor, payout tracking, dispute monitoring |
| **Cash Flow** | Daily net position, 13-week forecast with ML prediction intervals (P10/P50/P90), AR aging |
| **CFO / FP&A** | Monthly P&L, revenue by product line, cash burn, runway |
| **ML** | LightGBM quantile regression for cash forecasting; XGBoost decline-retry advisor |
| **Deploy** | Single-container Fly.io deployment with persistent volume, cron jobs, and secrets management |

---

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐     ┌────────────────────────────┐
│  Stripe     │     │              │     │   DuckDB /      │     │   FastAPI Backend          │
│  Webhooks   │────▶│  Ingestion   │────▶│   Postgres      │────▶│   · Live API & Webhooks    │
│  Plaid Feeds│     │  (Python)    │     │   (Ledger)      │     │   · Analytics / Reports    │
└─────────────┘     └──────────────┘     └────────┬────────┘     │   · Serves Built React SPA │
                                                  │              └─────────────┬──────────────┘
                                                  │                            │
                                                  │                            ▼
                                                  │              ┌────────────────────────────┐
                                                  │              │   React + Vite SPA         │
                                                  │              │   · Live Pipeline & Stream │
                                                  │              │   · Executive Overview     │
                                                  │              │   · Cash Flow & Forecast   │
                                                  │              │   · CFO & Revenue          │
                                                  │              │   · Ops & AI Advisor       │
                                                  │              │   · AR Aging               │
                                                  ▼              └────────────────────────────┘
                                            ┌─────────────────────────────┐
                                            │   Nightly cron (cron job):  │
                                            │   ingest → reconcile →      │
                                            │   retrain ML → predict      │
                                            └─────────────────────────────┘
```

**Key design decisions:**
- **DuckDB** — embedded OLAP engine; no separate database server required locally
- **Polars** — fast in-process DataFrame transforms before writing to DuckDB
- **Unified FastAPI & React architecture** — single FastAPI service serves live streaming feeds, manual transaction entry, webhooks, analytics endpoints, and the compiled modern React SPA from the same origin (with classic self-contained fallback at `/legacy`)
- **React 18 + TypeScript + Vite** — modular component-based frontend with Chart.js visualization for all 6 financial operations tabs
- **uv** — fast, reproducible Python dependency management

---

## Quick Start

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Python | 3.11+ | Ingestion, ML, backend API, scripts |
| uv | latest | Python package manager (`curl -LsSf https://astral.sh/uv/install.sh \| sh`) |
| Node.js | 18+ / 20+ | Frontend dependencies and Vite build |
| npm | 9+ | Node package manager |
| Docker | any | Multi-stage production container image |
| flyctl | latest | Fly.io deployment |

### 1. Clone and install

```bash
git clone https://github.com/yourusername/ledgerflow.git
cd ledgerflow

# Install Python and frontend dependencies
make install
make web-install
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

Opens the **unified dashboard** at `http://localhost:8080` with a live streaming feed (synthetic transactions every few seconds), manual transaction entry, and all BI tabs.

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
make dev             # Generate data + start unified dashboard (port 8080)
make generate-data   # Generate 50k synthetic transactions into DuckDB
make train           # Train both ML models

# Frontend (React / Vite)
make web             # Start React Vite dev server (port 5173) with API proxy
make web-build       # Build production React frontend into frontend/dist
make web-install     # Install frontend dependencies (npm install)
make web-test        # Run frontend Vitest test suite

# Testing & quality
make test            # Run all tests (Python pytest + frontend Vitest)
make test-python     # Run Python unit and integration tests
make lint            # Ruff check & format check
make typecheck       # mypy type checking

# Database
make db-init         # Initialise DuckDB schema
make db-migrate      # Run schema migrations
make db-reconcile    # Run nightly reconciliation manually

# Build & deploy
make build           # Build multi-stage Docker image
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

Production runs with `DEMO_MODE=false` — the dashboard reflects only real ingested data (webhooks + nightly pulls).

---

## Testing

```bash
make test          # Full suite: Python (pytest) + Frontend (Vitest)
make test-python   # Python unit and integration tests only
make web-test      # Frontend unit and hook tests only
make lint          # Ruff check & formatting validation
make typecheck     # mypy type checking
```

---

## Project Structure

```
ledgerflow/
│
├── .github/
│   └── workflows/
│       └── ci.yml                      # CI: python (lint/typecheck/test) + frontend (tsc/vitest/build)
│
├── docker/
│   ├── Dockerfile                      # Multi-stage image (Node frontend builder + Python runtime)
│   ├── docker-entrypoint.sh            # Container startup logic
│   └── crontab                         # Cron schedules (nightly ingest, weekly retrain)
│
├── frontend/                           # React 18 + TypeScript + Vite SPA
│   ├── src/
│   │   ├── components/                 # Shared UI components
│   │   ├── features/                   # 6 Dashboard tabs:
│   │   │   ├── live-pipeline/          # Real-time transaction ticker & manual entry
│   │   │   ├── executive/              # Runway, burn rate, cash trajectory
│   │   │   ├── cashflow/               # 13-week ML forecast fan chart (P10/P50/P90)
│   │   │   ├── revenue/                # P&L, MoM growth combo, product mix
│   │   │   ├── ops/                    # Decline analysis & ML retry advisor
│   │   │   └── ar-aging/               # AR aging buckets & overdue spotlight
│   │   ├── lib/                        # API client, tab definitions, formatters
│   │   ├── styles/                     # CSS stylesheets & design tokens
│   │   ├── App.tsx                     # Main layout shell and tab router
│   │   └── main.tsx                    # React entry point
│   ├── dist/                           # Compiled production bundle (served by FastAPI at /)
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── scripts/                            # Python pipeline — grouped by responsibility
│   ├── api/                            # Unified FastAPI service
│   │   ├── __init__.py
│   │   ├── webhooks.py                 # FastAPI: serves React app + webhooks + REST endpoints
│   │   └── live_input.html             # Classic fallback dashboard (reachable at /legacy)
│   │
│   ├── db/                             # Database management
│   │   ├── __init__.py
│   │   ├── init_db.py                  # Initialise DuckDB schema (incl. analytics views)
│   │   └── migrate.py                  # Schema migrations
│   │
│   ├── ingestion/                      # Data ingestion & reconciliation
│   │   ├── __init__.py
│   │   ├── ingest_stripe.py            # Stripe webhooks → ledger
│   │   ├── ingest_plaid.py             # Plaid bank feeds → ledger
│   │   └── reconcile.py                # Nightly reconciliation
│   │
│   ├── ml/                             # Machine learning
│   │   ├── __init__.py
│   │   ├── train_forecast.py           # Train LightGBM quantile regression
│   │   ├── train_retry.py              # Train XGBoost decline-retry classifier
│   │   └── predict_cashflow.py         # Batch cash flow inference
│   │
│   └── utils/                          # Dev tooling & ops
│       ├── __init__.py
│       ├── generate_synthetic.py       # Generate 50k+ synthetic transactions
│       └── health_check.py             # Readiness / liveness probe
│
├── tests/
│   ├── unit/
│   │   ├── test_generate_synthetic.py
│   │   ├── test_live_input.py
│   │   ├── test_ml.py
│   │   └── test_schema.py
│   └── integration/
│
├── models/                             # Trained .joblib artifacts (gitignored)
├── data/                               # DuckDB file (gitignored)
│
├── pyproject.toml                      # Python deps + ruff / mypy / pytest config
├── fly.toml                            # Fly.io deployment config
├── docker-compose.yml                  # Local single-service dev compose
├── Makefile                            # All dev, test, build, deploy targets
├── .env.example                        # Environment variable reference
└── .gitignore
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
| `WEBHOOK_PORT` | All | Port the unified dashboard listens on (default: `8080`) |
| `DEMO_MODE` | Dev only | Stream synthetic demo transactions on startup (`true`/`false`, default `true`) |
| `DEMO_INTERVAL_SEC` | Dev only | Seconds between demo transactions (default: `4`) |
| `SENTRY_DSN` | Optional | Sentry error-tracking DSN |
| `SLACK_WEBHOOK_URL` | Optional | Slack webhook URL for operational alerts |
| `LOG_LEVEL` | All | Logging verbosity (`DEBUG`, `INFO`, `WARNING`) |

> **Never commit `.env` to version control.** Use `fly secrets set` for production credentials.

---

## Dashboard — Unified View

One dashboard at `http://localhost:8080` with tabbed views covering every finance audience:

| Tab | Audience | Data freshness |
|-----|----------|----------------|
| Live Pipeline | Payments engineers, risk team | Real-time (webhook-driven) |
| Executive Overview | CFO, CEO, board | Daily |
| Cash Flow & Forecast | Treasurer, controller | Daily (nightly cron) |
| CFO & Revenue | CFO, FP&A | Monthly |
| Fintech Ops & AI | Payments engineers, risk team | Real-time |
| AR Aging | Collections / finance | Daily |

It also provides a **manual transaction input form** and a **live streaming feed**, plus a REST API (`/docs` for OpenAPI docs) for webhooks and reports.

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

> **LedgerFlow** — *Python · TypeScript · React 18 · DuckDB · Polars · FastAPI · LightGBM · XGBoost · Vite · Fly.io · GitHub Actions*
> Built a deployable financial observability platform ingesting Stripe + Plaid bank feeds into a unified ledger; shipped a unified dashboard (modular React/TypeScript SPA served via FastAPI) combining a real-time streaming pipeline, manual transaction input, ML 13-week cash forecast with prediction intervals (quantile regression), CFO variance views, and decline-retry advisor; automated nightly reconciliation and weekly model retraining via CI/CD on Fly.io.

---

## Roadmap

- [ ] Multi-tenant support (row-level security)
- [ ] ERP integrations (NetSuite, QuickBooks Online)
- [ ] Anomaly detection on transaction volume (Isolation Forest)
- [ ] Dispute / fraud prediction pre-authorisation
- [ ] Server-Sent Events (SSE) push for the live feed (replace polling)
- [ ] Kubernetes Helm chart for on-prem deployment

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

## Author

[Your Name](https://github.com/yourusername) · [LinkedIn](https://linkedin.com/in/yourprofile) · [Email](mailto:you@example.com)