# LedgerFlow

**Real-time financial observability platform** — unifying payment operations, cash forecasting, and FP&A views on a single transaction ledger.

[![CI](https://github.com/yourusername/ledgerflow/actions/workflows/ci.yml/badge.svg)](https://github.com/yourusername/ledgerflow/actions/workflows/ci.yml)
[![Deploy](https://github.com/yourusername/ledgerflow/actions/workflows/deploy.yml/badge.svg)](https://github.com/yourusername/ledgerflow/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 🎯 What it does

| Layer | Capability |
|-------|------------|
| **Ingestion** | Stripe webhooks + bank feeds → normalized transaction ledger |
| **Fintech Ops** | Real-time success rates, decline code analysis, payout tracking, dispute monitoring |
| **Cash Flow** | Daily net position, 13-week forecast with **ML prediction intervals** (quantile regression), collections aging |
| **CFO / FP&A** | Monthly P&L, variance vs. budget, burn/runway, revenue waterfall |
| **ML** | LightGBM quantile regression for cash forecasting; XGBoost decline retry advisor |
| **Deploy** | Single-container Fly.io deployment with persistent volume, cron jobs, secrets management |

---

## 🏗 Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐     ┌──────────────────┐
│  Stripe     │     │              │     │   DuckDB /      │     │  Evidence.dev    │
│  Webhooks   │────▶│  Ingestion   │────▶│   Postgres      │────▶│  Dashboards      │
│  Bank Feeds │     │  (Python)    │     │   (Ledger)      │     │  (Static Site)   │
└─────────────┘     └──────────────┘     └────────┬────────┘     └──────────────────┘
                                                  │
                    ┌─────────────────────────────┼─────────────────────────────┐
                    ▼                             ▼                             ▼
           ┌─────────────────┐           ┌─────────────────┐           ┌─────────────────┐
           │  Fintech Ops    │           │   Cash Flow     │           │    CFO/FP&A     │
           │  (Real-time)    │           │  (ML Forecast)  │           │  (Monthly)      │
           └─────────────────┘           └─────────────────┘           └─────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 20+
- Docker (for production deployment)
- Fly.io CLI (`flyctl`) — for deployment

### Local Development

```bash
# Clone and enter
git clone https://github.com/yourusername/ledgerflow.git
cd ledgerflow

# One-command setup (installs deps, generates data, starts dashboard)
make dev
```

This starts:
- **Evidence.dev dashboard** at `http://localhost:3000`
- **DuckDB** database at `data/ledgerflow.duckdb`
- **Hot reload** on code changes

### Generate Synthetic Data (no API keys needed)

```bash
make generate-data
# Creates 50k+ realistic transactions in data/ledgerflow.duckdb
```

### Run ML Training

```bash
make train
# Trains quantile regression (cash forecast) + decline retry model
# Outputs models to models/
```

---

## 📦 Deployment (Fly.io)

```bash
# First time only
fly auth login
fly launch --name ledgerflow --region iad --no-deploy
fly secrets set STRIPE_SECRET_KEY=sk_live_... PLAID_CLIENT_ID=... PLAID_SECRET=...

# Deploy
make deploy
# Or: fly deploy
```

**What gets provisioned:**
- 1x shared-cpu-1x VM (256MB RAM, scales up)
- 10GB persistent volume at `/data` (DuckDB + models)
- Private PostgreSQL (optional upgrade)
- Cron: nightly ingest, weekly ML retrain
- Custom domain + TLS via `fly certs add`

---

## 🧪 Testing

```bash
make test          # Unit tests (pytest + vitest)
make lint          # Ruff + ESLint + SQLFluff
make typecheck     # mypy + tsc
```

---

## 📁 Project Structure

```
ledgerflow/
├── .github/workflows/     # CI/CD pipelines
├── docker/
│   ├── Dockerfile         # Multi-stage: builder → runtime
│   └── docker-entrypoint.sh
├── evidence/              # Evidence.dev dashboard
│   ├── sources/           # SQL table definitions
│   ├── pages/             # Markdown dashboard pages
│   └── components/        # Custom React components
├── scripts/
│   ├── generate_synthetic.py
│   ├── ingest_stripe.py
│   ├── ingest_plaid.py
│   ├── train_forecast.py
│   ├── train_retry.py
│   └── reconcile.py
├── models/                # Trained model artifacts (gitignored)
├── data/                  # DuckDB file (gitignored)
├── tests/
│   ├── unit/
│   └── integration/
├── pyproject.toml         # Python deps (uv)
├── package.json           # Node deps (Evidence)
├── fly.toml               # Fly.io config
├── Makefile               # Dev/deploy commands
└── README.md
```

---

## 🔑 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `STRIPE_SECRET_KEY` | Prod only | Stripe secret key (test: `sk_test_...`, live: `sk_live_...`) |
| `STRIPE_WEBHOOK_SECRET` | Prod only | `whsec_...` from Stripe dashboard |
| `PLAID_CLIENT_ID` | Prod only | Plaid client ID |
| `PLAID_SECRET` | Prod only | Plaid secret |
| `PLAID_ENV` | Prod only | `sandbox` \| `development` \| `production` |
| `DATABASE_URL` | Prod only | PostgreSQL connection string (Fly Postgres) |
| `DUCKDB_PATH` | Local | Path to DuckDB file (default: `/data/ledgerflow.duckdb`) |
| `MODEL_REGISTRY_PATH` | All | Where trained models are stored |

Copy `.env.example` → `.env` for local development.

---

## 📊 Dashboard Pages

| Page | Audience | Refresh |
|------|----------|---------|
| `/ops` | Payments engineers, risk team | Real-time (webhook driven) |
| `/cashflow` | Treasurer, controller | Daily (cron) |
| `/cfo` | CFO, CEO, Board | Monthly (manual refresh) |

---

## 🤖 ML Models

| Model | Type | Target | Features |
|-------|------|--------|----------|
| `cash_forecast` | LightGBM Quantile Regression | `days_until_payment` (P10/P50/P90) | Vendor/customer history, amount, DOW, month, invoice aging |
| `decline_retry` | XGBoost Binary Classification | `succeeded_on_retry_7d` | Decline code, card brand, funding, amount, hour, customer retry history |

Retrained weekly via cron. Inference runs daily for cash forecast; real-time for decline advisor.

---

## 📈 Resume Bullet

> **LedgerFlow** — *Python, DuckDB, Evidence.dev, LightGBM, XGBoost, Fly.io, GitHub Actions*
> Built a deployable financial observability platform ingesting Stripe + bank feeds into a unified ledger; shipped real-time payments ops dashboard, 13-week cash forecast with ML prediction intervals (quantile regression), and CFO variance views; automated nightly reconciliation and weekly model retraining via CI/CD.

---

## 🛣 Roadmap

- [ ] Multi-tenant support (row-level security)
- [ ] ERP integration (NetSuite, QuickBooks)
- [ ] Anomaly detection on transaction volume (Isolation Forest)
- [ ] Dispute/fraud prediction pre-auth
- [ ] Evidence.dev → custom React frontend (for embedding)
- [ ] Kubernetes Helm chart for on-prem deployment

---

## 📄 License

MIT — see [LICENSE](LICENSE) for details.

---

## 🙋‍♀️ Author

[Your Name](https://github.com/yourusername) — [LinkedIn](https://linkedin.com/in/yourprofile) — [Email](mailto:you@example.com)