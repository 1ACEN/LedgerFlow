# LedgerFlow — Complete Project Reference

> **Financial observability for modern finance teams** — unified payment operations, ML-powered cash forecasting, RBAC-scoped analytics, and FP&A views in a single live platform.

---

## 1. Project Overview

LedgerFlow ingests payment and bank transaction feeds (Stripe webhooks/API and Plaid bank feeds) into a normalized **PostgreSQL 16** ledger, runs scheduled reconciliation and machine learning pipelines (**LightGBM** & **XGBoost**), and serves a unified **FastAPI** backend + **React 18 / TypeScript / Vite** single-page application (SPA) from the same origin (or split across Vercel + Render).

### Core Capabilities
- **Unified Ingestion & Ledger:** Normalizes Stripe charges/refunds/payouts/disputes and Plaid bank transactions into a single `transactions` fact table supporting both `cash` and `accrual` accounting bases, multi-currency FX conversion, and idempotent upserts.
- **High-Throughput PostgreSQL Pipeline:** Uses `psycopg` v3 connection pooling (`psycopg_pool`) and **Polars** DataFrames streamed via `TEMP TABLE` + `COPY FROM STDIN` + `ON CONFLICT` upserts.
- **ML Cash Flow Forecasting & Decline Retry Advisor:**
  - **LightGBM Quantile Regression** (`cash_forecast.joblib`) predicting daily net cash flow and cumulative 13-week (91-day) runway with P10 / P50 / P90 prediction intervals.
  - **XGBoost Binary Classification** (`decline_retry.joblib`) scoring failed card transactions for 7-day retry recovery probability and recommending optimal retry windows (`retry_1h`, `retry_24h`, `retry_72h`, `do_not_retry`).
- **Real-Time Pipeline & Live Demo Stream:** Supports Stripe/Plaid webhook ingestion, manual transaction entry (`POST /transactions/manual`), and an optional background synthetic transaction stream (`DEMO_MODE=true`) for live UI telemetry.
- **Enterprise Auth & RBAC:** PostgreSQL-backed user accounts with **PBKDF2-HMAC-SHA256** (100,000 rounds, per-user random salt, constant-time `secrets.compare_digest`) and 5 clearance roles governing module visibility.
- **BI & Power BI Integration:** Pre-built `analytics.*` SQL views enable direct **Power BI** `DirectQuery` or `Import` connections without CSV exports.

---

## 2. Technology Stack

| Layer | Technologies |
|---|---|
| **Backend & API** | Python 3.11+, FastAPI, Uvicorn, Pydantic v2, `pydantic-settings` |
| **Database & Data Engineering** | PostgreSQL 16 (`psycopg[binary,pool]` v3), Polars, PyArrow, Pandas, DuckDB (legacy source + migration CLI) |
| **Machine Learning** | LightGBM, XGBoost, scikit-learn, joblib, NumPy |
| **Integrations** | `stripe`, `plaid-python`, `faker`, `apscheduler` |
| **Frontend SPA** | React 18, TypeScript 5, Vite 5, Chart.js 4, CSS design tokens (`theme.css`) |
| **Testing & Quality** | `pytest`, `pytest-cov`, `pytest-mock`, `hypothesis`, `vitest`, `tsc`, `ruff`, `mypy`, `sqlfluff`, Trivy |
| **Packaging & DevOps** | `uv`, GNU Make, Docker (multi-stage build), Docker Compose, cron, GitHub Actions, Render, Vercel, Fly.io |

---

## 3. Repository Structure

```text
LedgerFlow/
├── .github/workflows/ci.yml        # CI: Python (PostgreSQL 16, ruff, mypy, pytest), Frontend (tsc, vitest, vite build), Trivy scan
├── docker/
│   ├── Dockerfile                  # 3-stage build: Node 20 frontend -> Python 3.11 builder -> slim runtime + cron
│   ├── docker-entrypoint.sh        # Initializes Postgres schema/migrations, seeds synthetic data if empty, runs forecast, starts cron + Uvicorn
│   └── crontab                     # Nightly Stripe/Plaid ingest, reconciliation, daily forecast, weekly ML retrain, 15m health check
├── frontend/
│   ├── public/assets/logo/         # Emblem icon and full ribbon logo assets
│   ├── src/
│   │   ├── components/             # LoadingBox (1s SVG chart transition), Sidebar (role-filtered drawer), ThemeToggle, ChartBox
│   │   ├── features/
│   │   │   ├── auth/               # AuthContext, LoginPage (Sign In / Create Account), RBAC role definitions (types.ts)
│   │   │   ├── live-pipeline/      # Real-time transaction ticker, source distribution, manual transaction form
│   │   │   ├── executive/          # Runway, burn rate, cash trajectory, revenue vs expenses, alerts, health/risk
│   │   │   ├── cashflow/           # 13-week ML fan chart (P10/P50/P90), actual vs forecast, scenario matrix, weekly flows
│   │   │   ├── revenue/            # Monthly P&L, MoM growth combo, product mix, budget vs actual, department expenses, debt/capital
│   │   │   ├── ops/                # Decline analysis, XGBoost retry advisor, disputes, anomaly detection, fraud risk, gateway metrics
│   │   │   └── ar-aging/           # AR aging buckets, overdue spotlight, collection efficiency, high-risk accounts
│   │   ├── lib/                    # api.ts, tabs.ts, ThemeContext.tsx
│   │   ├── styles/theme.css        # Day/Night theme tokens & responsive layout styles
│   │   ├── App.tsx                 # Top bar, drawer shell, transition loading box, tab routing
│   │   └── main.tsx                # React entrypoint
│   ├── package.json                # React 18, Chart.js 4, TypeScript 5, Vite 5, Vitest 2
│   └── vercel.json                 # Vercel SPA fallback + API/reports/stats/transactions/health proxy rewrites to Render
├── models/
│   ├── cash_forecast.joblib        # Trained LightGBM quantile regression bundle
│   └── decline_retry.joblib        # Trained XGBoost decline-retry classifier bundle
├── scripts/
│   ├── api/
│   │   ├── webhooks.py             # Unified FastAPI app (REST, webhooks, auth, analytics reports, SPA static serving)
│   │   └── auth_db.py              # PBKDF2-HMAC-SHA256 user management & Postgres users table
│   ├── db/
│   │   ├── connection.py           # Thread-safe psycopg3 ConnectionPool, read_polars(), copy_upsert_dataframe()
│   │   ├── init_db.py              # Core DDL: public/analytics/ml schemas, tables, generated columns, views, indexes
│   │   ├── migrate.py              # Versioned PostgreSQL migration runner
│   │   └── migrate_duckdb_to_postgres.py  # Idempotent DuckDB -> PostgreSQL data transfer CLI
│   ├── ingestion/
│   │   ├── common.py               # Shared schema normalization & Postgres COPY upsert pipeline
│   │   ├── ingest_stripe.py        # Stripe API / webhook transaction ingestion
│   │   ├── ingest_plaid.py         # Plaid bank feed ingestion
│   │   └── reconcile.py            # Nightly Stripe payout vs Plaid bank deposit reconciliation
│   ├── ml/
│   │   ├── train_forecast.py       # LightGBM quantile regression (P10/P50/P90) training
│   │   ├── train_retry.py          # XGBoost binary classifier training & historical scoring
│   │   └── predict_cashflow.py     # Daily 91-day (13-week) cash flow & runway inference
│   └── utils/
│       ├── generate_synthetic.py   # Generates 50k+ realistic multi-source financial transactions
│       └── health_check.py         # Readiness/liveness DB & model artifact check
├── tests/
│   ├── conftest.py                 # Isolated per-test PostgreSQL database fixtures
│   └── unit/                       # test_auth.py, test_generate_synthetic.py, test_live_input.py, test_ml.py, test_schema.py
├── docker-compose.yml              # Local app + PostgreSQL 16 (port 5433) services with healthchecks
├── fly.toml                        # Fly.io deployment configuration
├── render.yaml                     # Render Docker web service configuration
├── Makefile                        # Unified dev, seed, train, test, lint, typecheck, db, build, and deploy targets
├── pyproject.toml                  # Python dependencies (uv), ruff, mypy, pytest, coverage, and sqlfluff configuration
└── README.md                       # Setup, architecture, RBAC, Power BI, and deployment guide
```

---

## 4. Database Architecture (PostgreSQL 16)

LedgerFlow organizes tables and views across three PostgreSQL schemas defined in `scripts/db/init_db.py`:

### Schemas & Core Tables
1. **`public` schema**
   - **`transactions`**: Unified fact table keyed by `transaction_id` with unique `idempotency_key`. Stores timestamps (`occurred_at`, `posted_at`), pre-extracted date/calendar fields, `type` (`charge`, `refund`, `payout`, `fee`, `transfer`, `invoice_payment`, `adjustment`), `status` (`succeeded`, `failed`, `pending`, `disputed`, `canceled`), `source` (`stripe`, `adyen`, `ach`, `wire`, `plaid`, `manual_journal`), integer cents (`amount`, `net_amount`, `fee_amount`), `currency` (ISO 4217), `fx_rate`, `basis` (`cash` or `accrual`), `decline_code`, `dispute_id`/`dispute_status`, `metadata_json` (`JSONB`), and PostgreSQL `GENERATED ALWAYS ... STORED` USD columns (`amount_usd`, `net_amount_usd`, `fee_amount_usd`).
   - **`customers`**: Customer dimension (`customer_id`, `customer_email`, `customer_name`, `country`, `plan`, `ltv_usd`, `is_active`).
   - **`merchants`**: Merchant/bank account dimension (`merchant_account_id`, `account_name`, `currency`, `country`, `is_active`).
   - **`users`**: Authentication table (`user_id`, `username`, `password_hash`, `salt`, `full_name`, `role_id`, `created_at`).
2. **`ml` schema**
   - **`ml.cash_flow_forecast`**: Daily forecast rows keyed by `(forecast_date, prediction_date)` with `horizon_days`, P10/P50/P90 net flow and cumulative cash projections, P10/P50/P90 runway days, and model version metadata.
   - **`ml.decline_predictions`**: Per-transaction retry probability, `customer_retry_history` (`JSONB`), `recommended_action`, `recommended_retry_at`, and `expected_recovery_usd`.
   - **`ml.model_registry`**: Registered model metadata, `metrics_json` (`JSONB`), `feature_columns`, and `target_column`.
3. **`analytics` schema (Views for API & Power BI)**
   - `analytics.daily_cash_position`
   - `analytics.monthly_pl`
   - `analytics.revenue_by_product`
   - `analytics.success_rate_daily`
   - `analytics.decline_analysis`
   - `analytics.disputes`
   - `analytics.forecasts`
   - `analytics.ar_aging`

### High-Throughput Data Access (`scripts/db/connection.py`)
- Thread-safe cached `psycopg_pool.ConnectionPool` (`min_size=1`, `max_size=10`, `max_lifetime=300`) keyed by normalized `DATABASE_URL`.
- `read_polars()` executes SQL via `psycopg` and coerces `Decimal` scalars to `float` into Polars DataFrames.
- `copy_upsert_dataframe()` creates a `TEMP TABLE ... ON COMMIT DROP`, streams rows via `COPY ... FROM STDIN`, and merges into the target table using `INSERT ... ON CONFLICT DO UPDATE` (or `DO NOTHING`).
- `scripts/db/migrate_duckdb_to_postgres.py` transfers existing local DuckDB tables (`users`, `customers`, `merchants`, `transactions`, and `ml.*` tables) idempotently into PostgreSQL.

---

## 5. Backend API & Endpoints (`scripts/api/webhooks.py`)

FastAPI serves both the JSON API and the compiled React SPA (`frontend/dist/index.html` at `/`):

### Authentication
- `POST /api/auth/login` — Verifies username and password against PostgreSQL `users` using PBKDF2-HMAC-SHA256.
- `POST /api/auth/signup` — Registers a new user with chosen role clearance (`201 Created`).
- `GET /api/auth/roles` — Lists available RBAC roles and metadata.

### Live Pipeline & Transactions
- `POST /transactions/manual` — Validates and inserts manual journal/payment entries (`201 Created`).
- `GET /transactions/recent` — Fetches recent ledger events for the live ticker.
- `GET /stats/live` — Real-time volume, throughput, and gateway status telemetry.

### Analytics & ML Reports
- `GET /reports/executive` — Executive runway, burn rate, cash trajectory, revenue vs expenses, and alerts.
- `GET /reports/cashflow` — Historical cash position + 13-week LightGBM P10/P50/P90 forecast and scenario data.
- `GET /reports/revenue` — Monthly P&L, MoM revenue growth, product mix, budget vs actual, department spend, and debt/capital metrics.
- `GET /reports/ops` — Payment success trends, decline-code breakdown, XGBoost retry advisor recommendations, disputes, anomaly detection, and fraud risk indicators.
- `GET /reports/ar-aging` — Customer AR aging buckets (Current, 31–60d, 61–90d, 90+d), collection efficiency, and high-risk accounts.

### Webhooks & Observability
- `POST /webhooks/stripe` — Receives and ingests Stripe webhook events.
- `POST /webhooks/plaid` — Receives and ingests Plaid webhook notifications.
- `GET /health` — Health check endpoint used by Docker, Render, Fly.io, and Vercel.
- `GET /metrics` — Operational metrics endpoint.

---

## 6. Authentication & Role-Based Access Control (RBAC)

Defined across `scripts/api/auth_db.py` and `frontend/src/features/auth/types.ts`:

- **Password Security:** 100,000-round **PBKDF2-HMAC-SHA256** with a 16-byte random hex salt per user and `secrets.compare_digest` verification.
- **Zero-Trust Login UI:** Blank initial credential fields (`useState('')`) with a segmented Sign In / Create Account toggle.
- **5 Pre-Seeded Corporate Roles:**

| Role ID | Title / Persona | Badge | Allowed Modules |
|---|---|---|---|
| `admin` | Global System Administrator | Super Admin | All 6 (`executive`, `cashflow`, `revenue`, `ops`, `ar-aging`, `live-pipeline`) |
| `executive` | Sarah Chen (CEO) | Executive | 4 (`executive`, `cashflow`, `revenue`, `live-pipeline`) |
| `cfo` | Marcus Vance (CFO) | CFO / Treasury | 4 (`revenue`, `cashflow`, `ar-aging`, `executive`) |
| `ops` | Elena Rostova (VP Fintech Ops & AI) | Fintech Ops | 3 (`ops`, `live-pipeline`, `executive`) |
| `credit` | David Sterling (Credit & AR Lead) | Credit & Risk | 2 (`ar-aging`, `cashflow`) |

---

## 7. Machine Learning Models

### 1. Cash Flow Forecast (`scripts/ml/train_forecast.py`, `scripts/ml/predict_cashflow.py`)
- **Algorithm:** LightGBM Quantile Regression (`alpha = 0.10, 0.50, 0.90`).
- **Horizon:** 91 days (13 weeks) daily forecast written to `ml.cash_flow_forecast`.
- **Features:** Calendar features (day-of-week, day-of-month, month, quarter, year, weekend/month-start/month-end flags), lag features (1, 2, 3, 7, 14, 30 days on net flow, inflows, outflows), and rolling window statistics (7-day and 30-day windows).
- **Evaluation:** Pinball loss and MAE; minimum 60 days of cash-basis succeeded data for training (30 days for inference).

### 2. Decline Retry Advisor (`scripts/ml/train_retry.py`)
- **Algorithm:** XGBoost Binary Classifier (`succeeded_on_retry_7d` target).
- **Features:** Ordered decline code encoding (15 standard card decline reasons), card brand (`Visa`, `Mastercard`, `American Express`, `Discover`, `JCB`), card funding (`credit`, `debit`, `prepaid`), transaction amount in USD, hour of day, and customer retry history extracted from PostgreSQL `JSONB`.
- **Outputs:** Retry success probability, expected USD recovery, and action recommendation (`retry_1h`, `retry_24h`, `retry_72h`, `do_not_retry`) saved to `ml.decline_predictions`.
- **Evaluation:** ROC-AUC and Average Precision (PR-AUC).

---

## 8. Frontend Architecture (`frontend/`)

- **Framework:** React 18 + TypeScript 5 + Vite 5 + Chart.js 4 (`ChartBox.tsx` wrapper).
- **Navigation & UX:**
  - Minimalist 64px top bar with hamburger drawer trigger, LedgerFlow emblem/title, live stream indicator (`• Live`), last-updated timestamp, Day/Night `ThemeToggle`, and unified refresh trigger.
  - Slide-out `Sidebar` drawer dynamically filtered to only the user's `allowedTabs`.
  - `LoadingBox`: 1-second theme-reactive animated SVG rising line-chart transition overlay on login and module switches.
  - `theme.css` + `ThemeContext.tsx`: Day mode (default) and architectural obsidian Night mode (`#080B11` / `#101522`).
- **6 Modular Feature Views:** `live-pipeline`, `executive`, `cashflow`, `revenue`, `ops`, `ar-aging` — each backed by a custom data hook (`useLivePipeline`, `useExecutive`, `useCashflow`, `useRevenue`, `useOps`, `useArAging`) with accompanying Vitest unit tests.

---

## 9. Testing, Linting & CI/CD

### Local Commands (`Makefile`)
- `make dev` — Starts unified FastAPI + React dashboard on `http://localhost:8080`.
- `make web` / `make web-build` / `make web-test` — Vite dev server (`5173`), production build (`frontend/dist`), and Vitest suite.
- `make db-up` / `make db-init` / `make db-migrate` / `make db-import-duckdb` — Docker Postgres 16 (`5433`), schema setup, migrations, and DuckDB import.
- `make generate-data` / `make train` — Seeds 50,000 synthetic transactions and trains both ML models.
- `make test` (`test-python` + `web-test`), `make lint` (`ruff check` & `ruff format --check`), `make typecheck` (`mypy`).

### Test Suites
- **Python (`tests/unit/`):** `test_auth.py`, `test_generate_synthetic.py`, `test_live_input.py`, `test_ml.py`, `test_schema.py` — orchestrated via `tests/conftest.py` using isolated PostgreSQL test databases.
- **Frontend (`frontend/src/**/__tests__/`):** 8 Vitest test files covering API client, theme context, and all 6 feature hooks.

### GitHub Actions CI (`.github/workflows/ci.yml`)
1. **`python` job:** Spins up `postgres:16-alpine` service, installs deps with `uv sync --dev`, runs `ruff check`, `ruff format --check`, `mypy`, seeds 5,000 synthetic rows, and runs `pytest tests/unit`.
2. **`frontend` job:** Node 20, `npm ci`, `npm run typecheck` (`tsc --noEmit`), `npm test` (`vitest`), and `npm run build` (`vite build`).
3. **`security` job:** Runs `aquasecurity/trivy-action` vulnerability scanner.

---

## 10. Deployment & Scheduled Jobs

- **Docker (`docker/Dockerfile`, `docker-compose.yml`):** Multi-stage build compiling the React SPA in Node 20, installing Python dependencies with `uv`, and running non-root (`ledgerflow`) with `cron` + `uvicorn` via `docker-entrypoint.sh`.
- **Automated Cron Schedule (`docker/crontab`, UTC):**
  - `02:30` daily: `scripts.ingestion.ingest_stripe`
  - `02:35` daily: `scripts.ingestion.ingest_plaid`
  - `03:00` daily: `scripts.ingestion.reconcile`
  - `03:30` / `03:45` Sundays: `scripts.ml.train_forecast` & `scripts.ml.train_retry`
  - `06:00` daily: `scripts.ml.predict_cashflow`
  - Every 15 min: `scripts.utils.health_check`
- **Cloud Targets:**
  - **Render (`render.yaml`):** Docker web service (`PORT=8080`, `/health` check, external PostgreSQL via `DATABASE_URL`).
  - **Vercel (`frontend/vercel.json`):** Hosts frontend static assets and proxies `/api/*`, `/reports/*`, `/stats/*`, `/transactions/*`, and `/health` to `https://ledgerflow.onrender.com`.
  - **Fly.io (`fly.toml`):** Rolling release with `python -m scripts.db.migrate` release command and persistent volumes.

