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
| **Authentication & RBAC** | Enterprise role gateway with 5 position clearances, session persistence, and scoped page visibility |
| **Navigation & Shell** | Slide-out drawer navigation (role-filtered, zero lock icons) with 64px minimalist top bar & single unified refresh |
| **Telemetry Transitions** | Theme-reactive 1s traversing & rising line chart loading box on site entry and page switches |
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
- **PostgreSQL 16 (`psycopg[binary,pool]`)** — persistent, concurrent transactional & analytical ledger with `GENERATED ALWAYS ... STORED` columns, native `JSONB`, multi-schema views (`public`, `analytics`, `ml`), and direct Power BI `DirectQuery` / `Import` compatibility
- **Polars + PostgreSQL `COPY`** — fast in-process DataFrame transforms streamed cleanly into Postgres via `TEMP TABLE` + `COPY FROM STDIN` + `ON CONFLICT` upserts
- **Unified FastAPI & React architecture** — single FastAPI service serves live streaming feeds, manual transaction entry, webhooks, analytics endpoints, and the compiled modern React SPA from the same origin
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
make dev             # Start unified dashboard (port 8080) backed by PostgreSQL
make generate-data   # Generate 50k synthetic transactions into PostgreSQL
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

# Database (PostgreSQL)
make db-up             # Start local PostgreSQL 16 via Docker Compose (port 5433)
make db-init           # Initialize PostgreSQL schemas, tables, and views
make db-migrate        # Run PostgreSQL schema migrations
make db-reconcile      # Run nightly reconciliation manually
make db-import-duckdb  # Transfer existing data/ledgerflow.duckdb data into PostgreSQL

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
│   ├── public/                         # Static assets (emblem icon, full logo)
│   ├── src/
│   │   ├── components/                 # Shared UI components
│   │   │   ├── LoadingBox.tsx          # 1s traversing & rising line chart loading box
│   │   │   ├── LoadingBox.css          # Day/Night theme-reactive transition styling
│   │   │   ├── Sidebar.tsx             # Slide-out drawer navigation & profile card
│   │   │   ├── Sidebar.css             # Architectural, non-AI-gradient drawer styling
│   │   │   └── ThemeToggle.tsx         # Day / Night mode toggle switch
│   │   ├── features/                   # Feature modules:
│   │   │   ├── auth/                   # Enterprise RBAC gateway (LoginPage, AuthContext, types)
│   │   │   ├── live-pipeline/          # Real-time transaction ticker & manual entry
│   │   │   ├── executive/              # Runway, burn rate, cash trajectory
│   │   │   ├── cashflow/               # 13-week ML forecast fan chart (P10/P50/P90)
│   │   │   ├── revenue/                # P&L, MoM growth combo, product mix
│   │   │   ├── ops/                    # Decline analysis & ML retry advisor
│   │   │   └── ar-aging/               # AR aging buckets & overdue spotlight
│   │   ├── lib/                        # API client, tab definitions, formatters, ThemeContext
│   │   ├── styles/                     # theme.css design tokens & responsive foundations
│   │   ├── App.tsx                     # Main layout shell, header & drawer orchestration
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

One dashboard at `http://localhost:8080` with role-scoped modular views covering every finance audience:

| Tab | Audience | Data freshness | Default Clearance |
|-----|----------|----------------|-------------------|
| Live Pipeline | Payments engineers, risk team | Real-time (webhook-driven) | Admin, Executive, Ops |
| Executive Overview | CFO, CEO, board | Daily | Admin, Executive, CFO, Ops |
| Cash Flow & Forecast | Treasurer, controller | Daily (nightly cron) | Admin, Executive, CFO, Credit |
| CFO & Revenue | CFO, FP&A | Monthly | Admin, Executive, CFO |
| Fintech Ops & AI | Payments engineers, risk team | Real-time | Admin, Ops |
| AR Aging | Collections / finance | Daily | Admin, CFO, Credit |

---

## Role-Based Access Control (RBAC), Authentication & Navigation

LedgerFlow features an enterprise-grade authentication gateway backed by PostgreSQL and cryptographic PBKDF2 HMAC-SHA256 password hashing:

- **Users Database (`scripts/api/auth_db.py`, PostgreSQL `users` table):**
  - Manages accounts with per-user salt and 100,000 rounds of PBKDF2 HMAC-SHA256. Constant-time digest verification (`secrets.compare_digest`).
  - Pre-seeded with initial corporate roles on startup and supports real-time self-registration (`POST /api/auth/signup`).
  - REST endpoints: `POST /api/auth/login`, `POST /api/auth/signup`, `GET /api/auth/roles`.
- **Zero-Trust Input & Security:**
  - Username and password inputs start completely blank by default (`useState('')`) — preventing unintended auto-login or credential leaks on public deployments.
  - Eliminated the 1-click launch bypass to enforce real credential verification.
  - Clean segmented control to switch seamlessly between **Sign In** and **Create Account**.

---

## Connecting Power BI Directly (PostgreSQL Live Data)

Now that LedgerFlow runs on PostgreSQL, Power BI Desktop and Power BI Service can connect directly to the database (no static CSV exports needed):

1. Open **Power BI Desktop → Get Data → Database → PostgreSQL database**.
2. Enter **Server**: `localhost:5433` (Docker Postgres), `localhost:5432` (native Windows Postgres 18), or your hosted Neon/Supabase/Render Postgres host.
3. Enter **Database**: `ledgerflow`.
4. Choose **DirectQuery** (live real-time SQL queries on every slicer/visual interaction) or **Import** (fast cached tables with Scheduled Refresh).
5. Select core tables and pre-built analytical views:
   - `public.transactions`, `public.customers`, `public.merchants`
   - `analytics.daily_cash_position`, `analytics.monthly_pl`, `analytics.revenue_by_product`, `analytics.ar_aging`, `analytics.decline_analysis`, `analytics.forecasts`
- **Role Clearances & Permissions:**

| Role ID | Position / Title | Clearance Badge | Accessible Modules | Scope Summary |
|---------|------------------|-----------------|-------------------|---------------|
| `admin` | Global System Administrator | **Super Admin** | **All 6 Modules** | Full unrestricted access to all financial intelligence |
| `executive` | Sarah Chen (CEO) | **Executive** | 4 Modules | Executive Overview, Cash Flow, CFO & Revenue, Live Pipeline |
| `cfo` | Marcus Vance (CFO) | **CFO / Treasury** | 4 Modules | CFO & Revenue, Cash Flow, AR Aging, Executive Overview |
| `ops` | Elena Rostova (VP Fintech Ops) | **Fintech Ops** | 3 Modules | Fintech Ops & AI, Live Pipeline, Executive Overview |
| `credit` | David Sterling (Credit & AR Lead) | **Credit & Risk** | 2 Modules | AR Aging, Cash Flow & Forecast |

*Built-in Seed Accounts*: The database is pre-seeded with: `admin`/`admin`, `executive`/`exec`, `cfo`/`cfo`, `ops`/`ops`, `credit`/`credit`. Users can also create new custom accounts with their chosen clearance directly via the **Create Account** tab.

### UI/UX Pro Max Design System
- **Restrained Architectural Night Mode**: Stripped out distracting neon radial glow bloat and rainbow gradient washes in favor of calm, solid obsidian (`#080B11` / `#101522`), crisp 1px borders, and solid enterprise action buttons (`#2563EB`).
- **Default Day Mode**: Defaults to clean day mode with crisp slate surfaces and high-contrast typography.
- **Left Slide-out Drawer**: Accessible via the header hamburger button (`☰`). Filters and displays **strictly the accessible modules** for the active position. Zero lock icons or visual clutter.
- **Minimalist Top Bar**: Houses strictly the hamburger trigger, official emblem icon & title, live stream status (`• Live`), last updated telemetry timestamp, Day/Night toggle switch, and the single unified **Refresh** button.
- **1-Second Dynamic Line Chart Transition**: Whenever switching modules or entering the application, an animated SVG line chart traverses forward and rises to a peak with cyan-blue-indigo gradients and theme-reactive glassmorphism.

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