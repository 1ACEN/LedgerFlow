#!/usr/bin/env python3
"""
LedgerFlow: Database Migration Runner

Applies schema migrations on deployment (Fly.io release command).
Tracks applied migrations in a version table.

Usage:
    python scripts/migrate.py --db data/ledgerflow.duckdb
"""

import argparse
from pathlib import Path

import duckdb
from rich.console import Console

console = Console()

MIGRATIONS = [
    # Each migration: (version, description, sql)
    (
        "001",
        "Create core schema",
        """
        CREATE SCHEMA IF NOT EXISTS analytics;
        CREATE SCHEMA IF NOT EXISTS ml;

        CREATE TABLE IF NOT EXISTS transactions (
            transaction_id      VARCHAR PRIMARY KEY,
            idempotency_key     VARCHAR UNIQUE,
            occurred_at         TIMESTAMP WITH TIME ZONE NOT NULL,
            posted_at           TIMESTAMP WITH TIME ZONE,
            occurred_date       DATE,
            posted_date         DATE,
            occurred_hour       SMALLINT,
            occurred_dow        SMALLINT,
            occurred_week       SMALLINT,
            occurred_month      SMALLINT,
            occurred_quarter    SMALLINT,
            occurred_year       SMALLINT,
            type                VARCHAR NOT NULL,
            status              VARCHAR NOT NULL,
            source              VARCHAR NOT NULL,
            amount              BIGINT NOT NULL,
            currency            CHAR(3) NOT NULL,
            fx_rate             DOUBLE NOT NULL DEFAULT 1.0,
            net_amount          BIGINT NOT NULL,
            fee_amount          BIGINT NOT NULL DEFAULT 0,
            customer_id         VARCHAR,
            merchant_account_id VARCHAR,
            product_line        VARCHAR,
            department          VARCHAR,
            account_code        VARCHAR,
            cost_center         VARCHAR,
            basis               VARCHAR NOT NULL DEFAULT 'cash',
            decline_code        VARCHAR,
            risk_level          VARCHAR DEFAULT 'normal',
            dispute_id          VARCHAR,
            dispute_status      VARCHAR,
            is_recurring        BOOLEAN DEFAULT FALSE,
            description         VARCHAR,
            metadata_json       JSON,
            ingested_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            batch_id            VARCHAR,
            amount_usd          DOUBLE GENERATED ALWAYS AS (amount * fx_rate / 100.0),
            net_amount_usd      DOUBLE GENERATED ALWAYS AS (net_amount * fx_rate / 100.0),
            fee_amount_usd      DOUBLE GENERATED ALWAYS AS (fee_amount * fx_rate / 100.0)
        );

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

        CREATE TABLE IF NOT EXISTS merchants (
            merchant_account_id VARCHAR PRIMARY KEY,
            account_name        VARCHAR,
            currency            CHAR(3),
            country             CHAR(2),
            is_active           BOOLEAN DEFAULT TRUE
        );
    """,
    ),
    (
        "002",
        "Create ML tables",
        """
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
            recommended_action          VARCHAR,
            recommended_retry_at        TIMESTAMP WITH TIME ZONE,
            expected_recovery_usd       DOUBLE,
            model_version               VARCHAR,
            scored_at                   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

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
    """,
    ),
    (
        "003",
        "Create analytics views",
        """
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
    """,
    ),
    (
        "005",
        "Add forecasts alias view",
        """
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
    """,
    ),
    (
        "006",
        "Add explicit unique indexes for DuckDB v1.5 ON CONFLICT",
        """
        CREATE UNIQUE INDEX IF NOT EXISTS ux_transactions_id
            ON transactions(transaction_id);
        CREATE UNIQUE INDEX IF NOT EXISTS ux_transactions_idempotency
            ON transactions(idempotency_key);
    """,
    ),
    (
        "004",
        "Add indexes",
        """
        CREATE INDEX IF NOT EXISTS idx_transactions_occurred_date ON transactions(occurred_date);
        CREATE INDEX IF NOT EXISTS idx_transactions_posted_date ON transactions(posted_date);
        CREATE INDEX IF NOT EXISTS idx_transactions_customer ON transactions(customer_id);
        CREATE INDEX IF NOT EXISTS idx_transactions_type_status ON transactions(type, status);
        CREATE INDEX IF NOT EXISTS idx_transactions_source ON transactions(source);
        CREATE INDEX IF NOT EXISTS idx_transactions_dispute ON transactions(dispute_id);
        CREATE INDEX IF NOT EXISTS idx_cash_forecast_date ON ml.cash_flow_forecast(forecast_date);
        CREATE INDEX IF NOT EXISTS idx_decline_pred_customer ON ml.decline_predictions(customer_id);
        CREATE INDEX IF NOT EXISTS idx_transactions_idempotency ON transactions(idempotency_key);
    """,
    ),
]


def ensure_migration_table(conn: duckdb.DuckDBPyConnection):
    """Create migration tracking table if not exists."""
    conn.execute("""
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version VARCHAR PRIMARY KEY,
            description VARCHAR NOT NULL,
            applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            checksum VARCHAR
        )
    """)


def get_applied_migrations(conn: duckdb.DuckDBPyConnection) -> set:
    """Get set of already applied migration versions."""
    try:
        rows = conn.execute("SELECT version FROM schema_migrations").fetchall()
        return {r[0] for r in rows}
    except Exception:
        return set()


def apply_migration(conn: duckdb.DuckDBPyConnection, version: str, description: str, sql: str):
    """Apply a single migration."""
    console.log(f"Applying migration {version}: {description}")
    conn.execute(sql)
    conn.execute(
        """
        INSERT INTO schema_migrations (version, description, checksum)
        VALUES (?, ?, ?)
        ON CONFLICT (version) DO UPDATE SET
            description = EXCLUDED.description,
            applied_at = NOW(),
            checksum = EXCLUDED.checksum
    """,
        [version, description, str(hash(sql))],
    )


def main():
    parser = argparse.ArgumentParser(description="Run database migrations")
    parser.add_argument("--db", type=Path, default=Path("data/ledgerflow.duckdb"))
    parser.add_argument("--dry-run", action="store_true", help="Show what would be applied")
    args = parser.parse_args()

    args.db.parent.mkdir(parents=True, exist_ok=True)

    console.rule("[bold blue]LedgerFlow Database Migrations[/bold blue]")

    conn = duckdb.connect(str(args.db))

    ensure_migration_table(conn)
    applied = get_applied_migrations(conn)

    console.log(f"Already applied: {sorted(applied)}")

    for version, description, sql in MIGRATIONS:
        if version in applied:
            console.log(f"  [dim]Skipping {version} (already applied)[/dim]")
            continue

        if args.dry_run:
            console.log(f"  [yellow]Would apply[/yellow] {version}: {description}")
        else:
            apply_migration(conn, version, description, sql)
            console.log(f"  [green]Applied[/green] {version}")

    if args.dry_run:
        console.log("\n[yellow]Dry run complete - no changes made[/yellow]")
    else:
        console.rule("[bold green]Migrations complete![/bold green]")

    conn.close()


if __name__ == "__main__":
    main()
