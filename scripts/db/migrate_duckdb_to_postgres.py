#!/usr/bin/env python3
"""
LedgerFlow: DuckDB -> PostgreSQL Data Transfer Utility

Migrates existing local data (users, customers, merchants, transactions, ML tables)
from a DuckDB database file into PostgreSQL idempotently.

Usage:
    python -m scripts.db.migrate_duckdb_to_postgres --source data/ledgerflow.duckdb
"""

from __future__ import annotations

import argparse
from pathlib import Path

import polars as pl
from rich.console import Console

from scripts.db.connection import copy_upsert_dataframe, normalize_database_url, open_direct_conn
from scripts.db.init_db import SCHEMA_SQL
from scripts.ingestion.common import _INSERT_COLS

console = Console()


def migrate_duckdb_to_postgres(source_path: Path, db_url: str | None = None) -> dict[str, int]:
    """Copy all core and ML tables from a DuckDB file into PostgreSQL."""
    try:
        import duckdb
    except ImportError as exc:
        raise RuntimeError(
            "duckdb package is required to read the source DuckDB file for migration."
        ) from exc

    if not source_path.exists():
        raise FileNotFoundError(f"Source DuckDB file not found: {source_path}")

    url = normalize_database_url(db_url)
    duck = duckdb.connect(str(source_path), read_only=True)
    pg = open_direct_conn(url)

    counts: dict[str, int] = {}
    try:
        pg.execute(SCHEMA_SQL)

        existing_tables = {
            f"{row[0]}.{row[1]}"
            for row in duck.execute(
                """
                SELECT table_schema, table_name
                FROM information_schema.tables
                WHERE table_type = 'BASE TABLE'
                """
            ).fetchall()
        }

        table_specs: list[tuple[str, str, list[str], list[str] | None]] = [
            ("main.users", "users", ["user_id"], None),
            ("main.customers", "customers", ["customer_id"], None),
            ("main.merchants", "merchants", ["merchant_account_id"], None),
            (
                "main.transactions",
                "transactions",
                ["transaction_id"],
                _INSERT_COLS,
            ),
            (
                "ml.cash_flow_forecast",
                "ml.cash_flow_forecast",
                ["forecast_date", "prediction_date"],
                None,
            ),
            (
                "ml.decline_predictions",
                "ml.decline_predictions",
                ["transaction_id"],
                None,
            ),
        ]

        for duck_table, pg_table, conflict_cols, select_cols in table_specs:
            if duck_table not in existing_tables:
                continue

            col_sql = ", ".join(select_cols) if select_cols else "*"
            df: pl.DataFrame = duck.execute(f"SELECT {col_sql} FROM {duck_table}").pl()
            if df.is_empty():
                counts[pg_table] = 0
                continue

            copy_upsert_dataframe(
                pg,
                pg_table,
                df,
                conflict_cols=conflict_cols,
                do_nothing=True,
            )
            counts[pg_table] = len(df)
            console.log(f"[green][OK][/green] Migrated {len(df):,} rows into {pg_table}")
    finally:
        duck.close()
        pg.close()

    return counts


def main():
    parser = argparse.ArgumentParser(description="Migrate DuckDB ledger data to PostgreSQL")
    parser.add_argument(
        "--source",
        type=Path,
        default=Path("data/ledgerflow.duckdb"),
        help="Path to source DuckDB file",
    )
    parser.add_argument(
        "--db-url",
        dest="db_url",
        default=None,
        help="Target PostgreSQL URL (defaults to DATABASE_URL)",
    )
    args = parser.parse_args()

    console.rule("[bold blue]LedgerFlow DuckDB -> PostgreSQL Migration[/bold blue]")
    counts = migrate_duckdb_to_postgres(args.source, args.db_url)
    console.rule("[bold green]Migration Complete[/bold green]")
    for table, count in counts.items():
        console.log(f"  {table}: {count:,} rows")


if __name__ == "__main__":
    main()
