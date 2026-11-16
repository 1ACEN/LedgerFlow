#!/usr/bin/env python3
"""
LedgerFlow: Seed 2026 Financial Transactions (Jan 1, 2026 - Oct 31, 2026)

Generates 10,000 realistic financial transactions spanning January 1 to October 31, 2026
with balanced inflows (charges, subscriptions, invoices) and outflows (payouts, refunds, fees).
Supports direct ingestion into cloud PostgreSQL databases (Render, Neon, Supabase, Fly.io).

Usage:
    python -m scripts.utils.seed_2026 --db-url "postgresql://user:pass@host/dbname?sslmode=require"
"""

from __future__ import annotations

import argparse
import random
import sys
import uuid
from datetime import UTC, datetime
from pathlib import Path

import numpy as np
from faker import Faker
from rich.console import Console

_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from scripts.db.connection import normalize_database_url, open_direct_conn  # noqa: E402
from scripts.db.init_db import SCHEMA_SQL  # noqa: E402
from scripts.ingestion.common import _INSERT_COLS  # noqa: E402
from scripts.utils.generate_synthetic import (  # noqa: E402
    N_CUSTOMERS,
    N_MERCHANT_ACCOUNTS,
    generate_customers,
    generate_merchant_accounts,
    generate_transactions,
)

console = Console()
fake = Faker()


def seed_2026(
    db_url: str | None = None,
    rows: int = 10000,
    seed: int = 2026,
) -> int:
    """Generate and ingest transactions strictly for Jan 1, 2026 to Oct 31, 2026."""
    random.seed(seed)
    np.random.seed(seed)
    Faker.seed(seed)

    url = normalize_database_url(db_url)

    # Date range: 2026-01-01 00:00:00 UTC to 2026-10-31 23:59:59 UTC
    start_date = datetime(2026, 1, 1, 0, 0, 0, tzinfo=UTC)
    end_date = datetime(2026, 10, 31, 23, 59, 59, tzinfo=UTC)

    console.rule(
        f"[bold cyan]Seeding {rows:,} Transactions (Jan 1, 2026 - Oct 31, 2026)[/bold cyan]"
    )
    console.log(f"Target DB: [dim]{url.split('@')[-1] if '@' in url else url}[/dim]")
    console.log(
        f"Date Window: [green]{start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}[/green]"
    )

    conn = open_direct_conn(url)
    try:
        # Ensure schema, tables, and views exist
        console.log("Ensuring database schema exists...")
        conn.execute(SCHEMA_SQL)

        # Check / Seed customers
        cust_count = conn.execute("SELECT COUNT(*) FROM customers").fetchone()[0]
        if cust_count < 100:
            console.log(f"Seeding {N_CUSTOMERS} customers...")
            cust_df = generate_customers(N_CUSTOMERS)
            with (
                conn.cursor() as cur,
                cur.copy(
                    "COPY customers (customer_id, customer_email, customer_name, created_at, country, plan, ltv_usd, is_active) FROM STDIN"
                ) as copy,
            ):
                for r in cust_df.iter_rows():
                    copy.write_row(r)
        else:
            cust_df = generate_customers(N_CUSTOMERS)

        # Check / Seed merchants
        merch_count = conn.execute("SELECT COUNT(*) FROM merchants").fetchone()[0]
        if merch_count < 5:
            console.log("Seeding merchants...")
            merch_df = generate_merchant_accounts(N_MERCHANT_ACCOUNTS)
            with (
                conn.cursor() as cur,
                cur.copy(
                    "COPY merchants (merchant_account_id, account_name, currency, country, is_active) FROM STDIN"
                ) as copy,
            ):
                for r in merch_df.iter_rows():
                    copy.write_row(r)
        else:
            merch_df = generate_merchant_accounts(N_MERCHANT_ACCOUNTS)

        console.log(
            f"Generating {rows:,} balanced inflow/outflow transactions across Jan-Oct 2026..."
        )
        tx_df = generate_transactions(rows, start_date, end_date, cust_df, merch_df)

        # Load transactions via COPY
        cols_to_insert = [c for c in _INSERT_COLS if c in tx_df.columns]
        tx_insert = tx_df.select(cols_to_insert)

        col_list = ", ".join(cols_to_insert)
        staging_tbl = f"_stg_seed_{uuid.uuid4().hex[:10]}"

        console.log("Ingesting transactions via high-speed COPY...")
        with conn.transaction():
            conn.execute(
                f"CREATE TEMP TABLE {staging_tbl} ON COMMIT DROP AS SELECT {col_list} FROM transactions LIMIT 0"
            )
            with (
                conn.cursor() as cur,
                cur.copy(f"COPY {staging_tbl} ({col_list}) FROM STDIN") as copy,
            ):
                for row in tx_insert.iter_rows():
                    copy.write_row(row)

            conn.execute(
                f"INSERT INTO transactions ({col_list}) SELECT {col_list} FROM {staging_tbl} ON CONFLICT (transaction_id) DO NOTHING"
            )

        total_tx = conn.execute("SELECT COUNT(*) FROM transactions").fetchone()[0]
        inflows = conn.execute(
            "SELECT COUNT(*), COALESCE(SUM(amount_usd), 0) FROM transactions WHERE type IN ('charge', 'invoice_payment') AND status = 'succeeded' AND occurred_date BETWEEN '2026-01-01' AND '2026-10-31'"
        ).fetchone()
        outflows = conn.execute(
            "SELECT COUNT(*), COALESCE(SUM(amount_usd), 0) FROM transactions WHERE type IN ('refund', 'payout', 'fee') AND status = 'succeeded' AND occurred_date BETWEEN '2026-01-01' AND '2026-10-31'"
        ).fetchone()

        console.rule("[bold green]Seeding Successful![/bold green]")
        console.log(f"Total Transactions in DB: [bold green]{total_tx:,}[/bold green]")
        console.log(
            f"Jan-Oct 2026 Inflows:  [green]{inflows[0]:,} transactions (~${inflows[1]:,.2f})[/green]"
        )
        console.log(
            f"Jan-Oct 2026 Outflows: [red]{outflows[0]:,} transactions (~${outflows[1]:,.2f})[/red]"
        )
        return total_tx
    finally:
        conn.close()


def main():
    parser = argparse.ArgumentParser(description="Seed 2026 Jan-Oct financial transactions")
    parser.add_argument("--db-url", default=None, help="Cloud PostgreSQL connection string")
    parser.add_argument(
        "--rows", type=int, default=10000, help="Number of transactions (default: 10000)"
    )
    args = parser.parse_args()

    seed_2026(db_url=args.db_url, rows=args.rows)


if __name__ == "__main__":
    main()
