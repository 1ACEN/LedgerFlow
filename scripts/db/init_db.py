#!/usr/bin/env python3
"""
LedgerFlow: Database Initialization

Creates the DuckDB schema, views, and indexes for the transaction ledger.
Run once on first deployment or when schema changes.

Usage:
    python scripts/init_db.py --db data/ledgerflow.duckdb
"""

import argparse
from pathlib import Path

import duckdb
from rich.console import Console

console = Console()

SCHEMA_SQL = """
-- =============================================================================
-- LEDGERFLOW SCHEMA
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS analytics;
CREATE SCHEMA IF NOT EXISTS ml;

-- =============================================================================
-- CORE TABLES
-- =============================================================================

-- Unified transaction fact table (populated by ingestion scripts)
CREATE TABLE IF NOT EXISTS transactions (
    transaction_id      VARCHAR PRIMARY KEY,
    idempotency_key     VARCHAR UNIQUE,
    occurred_at         TIMESTAMP WITH TIME ZONE NOT NULL,
    posted_at           TIMESTAMP WITH TIME ZONE,
    occurred_date       DATE,
    posted_date         DATE,
    occurred_hour       SMALLINT,
    occurred_dow        SMALLINT,      -- 0=Sunday
    occurred_week       SMALLINT,
    occurred_month      SMALLINT,
    occurred_quarter    SMALLINT,
    occurred_year       SMALLINT,
    type                VARCHAR NOT NULL,      -- charge, refund, payout, fee, transfer, invoice_payment, adjustment
    status              VARCHAR NOT NULL,      -- succeeded, failed, pending, disputed, canceled
    source              VARCHAR NOT NULL,      -- stripe, adyen, ach, wire, plaid, manual_journal
    amount              BIGINT NOT NULL,       -- Cents in source currency
    currency            CHAR(3) NOT NULL,      -- ISO 4217
    fx_rate             DOUBLE NOT NULL DEFAULT 1.0,
    net_amount          BIGINT NOT NULL,       -- After fees
    fee_amount          BIGINT NOT NULL DEFAULT 0,
    customer_id         VARCHAR,
    merchant_account_id VARCHAR,
    product_line        VARCHAR,
    department          VARCHAR,
    account_code        VARCHAR,
    cost_center         VARCHAR,
    basis               VARCHAR NOT NULL DEFAULT 'cash',  -- 'cash' or 'accrual'
    decline_code        VARCHAR,
    risk_level          VARCHAR DEFAULT 'normal',
    dispute_id          VARCHAR,
    dispute_status      VARCHAR,
    is_recurring        BOOLEAN DEFAULT FALSE,
    description         VARCHAR,
    metadata_json       JSON,
    ingested_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    batch_id            VARCHAR,
    -- Derived (computed on insert)
    amount_usd          DOUBLE GENERATED ALWAYS AS (amount * fx_rate / 100.0),
    net_amount_usd      DOUBLE GENERATED ALWAYS AS (net_amount * fx_rate / 100.0),
    fee_amount_usd      DOUBLE GENERATED ALWAYS AS (fee_amount * fx_rate / 100.0)
);

-- Customer dimension
CREATE TABLE IF NOT EXISTS customers (
    customer_id     VARCHAR PRIMARY KEY,
    customer_email  VARCHAR,
    customer_name   VARCHAR,
    created_at      TIMESTAMP WITH TIME ZONE,
    country         CHAR(2),
    plan            VARCHAR,
    ltv_usd         DOUBLE DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE
);

-- Merchant accounts (our Stripe accounts, bank accounts)
CREATE TABLE IF NOT EXISTS merchants (
    merchant_account_id VARCHAR PRIMARY KEY,
    account_name        VARCHAR,
    currency            CHAR(3),
    country             CHAR(2),
    is_active           BOOLEAN DEFAULT TRUE
);

-- =============================================================================
-- ML TABLES
-- =============================================================================

-- Cash flow forecast predictions (generated daily)
CREATE TABLE IF NOT EXISTS ml.cash_flow_forecast (
    forecast_date       DATE NOT NULL,
    prediction_date     DATE NOT NULL,
    horizon_days        SMALLINT NOT NULL,
    p10_net_flow_usd    DOUBLE,
    p50_net_flow_usd    DOUBLE,
    p90_net_flow_usd    DOUBLE,
    p50_inflows_usd     DOUBLE,
    p50_outflows_usd    DOUBLE,
    starting_cash_usd   DOUBLE,
    p10_cumulative_cash_usd DOUBLE,
    p50_cumulative_cash_usd DOUBLE,
    p90_cumulative_cash_usd DOUBLE,
    p10_runway_days     SMALLINT,
    p50_runway_days     SMALLINT,
    p90_runway_days     SMALLINT,
    model_version       VARCHAR,
    model_trained_at    TIMESTAMP WITH TIME ZONE,
    feature_set_version VARCHAR,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (forecast_date, prediction_date)
);

-- Decline retry predictions (real-time scoring)
CREATE TABLE IF NOT EXISTS ml.decline_predictions (
    transaction_id              VARCHAR PRIMARY KEY,
    decline_code                VARCHAR,
    card_brand                  VARCHAR,
    card_funding                VARCHAR,
    amount_usd                  DOUBLE,
    occurred_hour               SMALLINT,
    customer_id                 VARCHAR,
    customer_retry_history      JSON,
    retry_success_probability   DOUBLE,
    recommended_action          VARCHAR,  -- 'retry_1h', 'retry_24h', 'retry_72h', 'do_not_retry'
    recommended_retry_at        TIMESTAMP WITH TIME ZONE,
    expected_recovery_usd       DOUBLE,
    model_version               VARCHAR,
    scored_at                   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Model registry
CREATE TABLE IF NOT EXISTS ml.model_registry (
    model_name          VARCHAR PRIMARY KEY,
    version             VARCHAR NOT NULL,
    file_path           VARCHAR NOT NULL,
    metrics_json        JSON,
    trained_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active           BOOLEAN DEFAULT TRUE,
    feature_columns     VARCHAR[],
    target_column       VARCHAR
);

-- =============================================================================
-- ANALYTICS VIEWS (consumed by the unified dashboard /reports/* endpoints)
-- =============================================================================

-- Daily cash position
CREATE OR REPLACE VIEW analytics.daily_cash_position AS
SELECT
    posted_date AS date,
    SUM(CASE WHEN net_amount_usd > 0 THEN net_amount_usd ELSE 0 END) AS inflows_usd,
    SUM(CASE WHEN net_amount_usd < 0 THEN -net_amount_usd ELSE 0 END) AS outflows_usd,
    SUM(net_amount_usd) AS net_flow_usd,
    SUM(SUM(net_amount_usd)) OVER (ORDER BY posted_date ROWS UNBOUNDED PRECEDING) AS cumulative_cash_usd
FROM transactions
WHERE basis = 'cash' AND status = 'succeeded'
GROUP BY posted_date
ORDER BY posted_date;

-- Monthly P&L
CREATE OR REPLACE VIEW analytics.monthly_pl AS
SELECT
    DATE_TRUNC('month', occurred_at)::DATE AS month,
    account_code,
    SUM(CASE WHEN amount_usd > 0 THEN amount_usd ELSE 0 END) AS credit_usd,
    SUM(CASE WHEN amount_usd < 0 THEN -amount_usd ELSE 0 END) AS debit_usd,
    SUM(amount_usd) AS net_usd
FROM transactions
WHERE basis = 'accrual' AND status = 'succeeded'
GROUP BY DATE_TRUNC('month', occurred_at), account_code
ORDER BY month, account_code;

-- Revenue by product line
CREATE OR REPLACE VIEW analytics.revenue_by_product AS
SELECT
    DATE_TRUNC('month', occurred_at)::DATE AS month,
    product_line,
    SUM(amount_usd) FILTER (WHERE type IN ('charge', 'invoice_payment') AND status = 'succeeded') AS revenue_usd,
    SUM(amount_usd) FILTER (WHERE type = 'refund' AND status = 'succeeded') AS refunds_usd,
    SUM(amount_usd) FILTER (WHERE type IN ('charge', 'invoice_payment') AND status = 'succeeded') -
    SUM(amount_usd) FILTER (WHERE type = 'refund' AND status = 'succeeded') AS net_revenue_usd
FROM transactions
WHERE basis = 'accrual' AND product_line IS NOT NULL
GROUP BY DATE_TRUNC('month', occurred_at), product_line
ORDER BY month, product_line;

-- Success rate by source/day
CREATE OR REPLACE VIEW analytics.success_rate_daily AS
SELECT
    occurred_date,
    source,
    COUNT(*) AS total_transactions,
    COUNT(*) FILTER (WHERE status = 'succeeded') AS succeeded_count,
    COUNT(*) FILTER (WHERE status = 'succeeded') * 1.0 / COUNT(*) AS success_rate
FROM transactions
WHERE type IN ('charge', 'invoice_payment')
GROUP BY occurred_date, source
ORDER BY occurred_date DESC, source;

-- Decline code analysis
CREATE OR REPLACE VIEW analytics.decline_analysis AS
SELECT
    decline_code,
    COUNT(*) AS total_declines,
    COUNT(*) FILTER (WHERE source = 'stripe') AS stripe_declines,
    COUNT(*) FILTER (WHERE source = 'adyen') AS adyen_declines,
    AVG(amount_usd) AS avg_amount_usd,
    COUNT(DISTINCT customer_id) AS unique_customers
FROM transactions
WHERE status = 'failed' AND decline_code IS NOT NULL
GROUP BY decline_code
ORDER BY total_declines DESC;

-- Dispute tracking
CREATE OR REPLACE VIEW analytics.disputes AS
SELECT
    dispute_id,
    transaction_id,
    customer_id,
    amount_usd,
    dispute_status,
    occurred_at AS dispute_created_at,
    occurred_at + INTERVAL '30 days' AS due_by
FROM transactions
WHERE dispute_id IS NOT NULL
ORDER BY occurred_at DESC;

-- Forecasts alias for the dashboard's cashflow report
CREATE OR REPLACE VIEW analytics.forecasts AS
SELECT
    forecast_date,
    prediction_date,
    horizon_days,
    p10_net_flow_usd,
    p50_net_flow_usd,
    p90_net_flow_usd,
    p50_inflows_usd,
    p50_outflows_usd,
    starting_cash_usd,
    p10_cumulative_cash_usd,
    p50_cumulative_cash_usd,
    p90_cumulative_cash_usd,
    p10_runway_days,
    p50_runway_days,
    p90_runway_days,
    model_version,
    model_trained_at,
    feature_set_version,
    created_at
FROM ml.cash_flow_forecast
ORDER BY prediction_date;

-- AR Aging (simplified - assumes invoice_payment type with terms)
CREATE OR REPLACE VIEW analytics.ar_aging AS
SELECT
    t.customer_id,
    c.customer_name,
    COUNT(*) AS invoice_count,
    SUM(amount_usd) AS total_outstanding_usd,
    SUM(amount_usd) FILTER (WHERE occurred_at >= NOW() - INTERVAL '30 days') AS current_usd,
    SUM(amount_usd) FILTER (WHERE occurred_at < NOW() - INTERVAL '30 days' AND occurred_at >= NOW() - INTERVAL '60 days') AS days_31_60_usd,
    SUM(amount_usd) FILTER (WHERE occurred_at < NOW() - INTERVAL '60 days' AND occurred_at >= NOW() - INTERVAL '90 days') AS days_61_90_usd,
    SUM(amount_usd) FILTER (WHERE occurred_at < NOW() - INTERVAL '90 days') AS days_90_plus_usd
FROM transactions t
JOIN customers c ON t.customer_id = c.customer_id
WHERE type = 'invoice_payment' AND status IN ('pending', 'succeeded') AND basis = 'accrual'
GROUP BY t.customer_id, c.customer_name
ORDER BY total_outstanding_usd DESC;

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_transactions_occurred_date ON transactions(occurred_date);
CREATE INDEX IF NOT EXISTS idx_transactions_posted_date ON transactions(posted_date);
CREATE INDEX IF NOT EXISTS idx_transactions_customer ON transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type_status ON transactions(type, status);
CREATE INDEX IF NOT EXISTS idx_transactions_source ON transactions(source);
CREATE INDEX IF NOT EXISTS idx_transactions_dispute ON transactions(dispute_id);
CREATE INDEX IF NOT EXISTS idx_cash_forecast_date ON ml.cash_flow_forecast(forecast_date);
CREATE INDEX IF NOT EXISTS idx_decline_pred_customer ON ml.decline_predictions(customer_id);
-- Explicit unique indexes required by DuckDB v1.5 for ON CONFLICT upserts
CREATE UNIQUE INDEX IF NOT EXISTS ux_transactions_id ON transactions(transaction_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_transactions_idempotency ON transactions(idempotency_key);
"""


def main():
    parser = argparse.ArgumentParser(description="Initialize LedgerFlow DuckDB schema")
    parser.add_argument(
        "--db", type=Path, default=Path("data/ledgerflow.duckdb"), help="DuckDB database path"
    )
    args = parser.parse_args()

    args.db.parent.mkdir(parents=True, exist_ok=True)

    console.rule("[bold blue]LedgerFlow Database Initialization[/bold blue]")

    conn = duckdb.connect(str(args.db))

    console.log("Executing schema...")
    conn.execute(SCHEMA_SQL)

    # Verify tables
    tables = conn.execute("""
        SELECT table_schema, table_name
        FROM information_schema.tables
        WHERE table_schema IN ('main', 'analytics', 'ml')
        ORDER BY table_schema, table_name
    """).fetchall()

    console.log("Created tables/views:")
    for schema, name in tables:
        console.log(f"  {schema}.{name}")

    conn.close()
    console.rule("[bold green]Database initialized successfully![/bold green]")


if __name__ == "__main__":
    main()
