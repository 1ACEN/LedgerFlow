#!/usr/bin/env python3
"""
LedgerFlow: Health Check Script (PostgreSQL)

Runs every 15 minutes via cron to verify system health.
Exits with non-zero code if any check fails (triggers alerting).

Usage:
    python -m scripts.utils.health_check
"""

from __future__ import annotations

import argparse
import shutil
import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

from rich.console import Console

from scripts.db.connection import normalize_database_url, open_direct_conn

console = Console()


def check_data_freshness(conn: Any, max_age_hours: int = 48) -> bool:
    """Check that we have recent transaction data."""
    result = conn.execute("""
        SELECT MAX(occurred_at) AS latest FROM transactions
    """).fetchone()

    if not result or result[0] is None:
        console.log("[red]FAIL[/red]: No transaction data found")
        return False

    latest = result[0]
    now = datetime.now(UTC)
    if isinstance(latest, datetime):
        if latest.tzinfo is None:
            latest = latest.replace(tzinfo=UTC)
        age = now - latest
    else:
        latest_dt = datetime.combine(latest, datetime.min.time(), tzinfo=UTC)
        age = now - latest_dt

    if age < timedelta(0):
        age = timedelta(0)

    if age > timedelta(hours=max_age_hours):
        console.log(f"[red]FAIL[/red]: Data is stale (latest: {latest}, age: {age})")
        return False

    console.log(f"[green]OK[/green]: Data fresh (latest: {latest}, age: {age})")
    return True


def check_table_counts(conn: Any) -> bool:
    """Verify core tables have data."""
    tables = [
        ("transactions", 100),
        ("customers", 10),
        ("merchants", 1),
    ]

    all_ok = True
    for table, min_count in tables:
        count = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
        if count < min_count:
            console.log(f"[red]FAIL[/red]: {table} has only {count} rows (min: {min_count})")
            all_ok = False
        else:
            console.log(f"[green]OK[/green]: {table} has {count:,} rows")

    return all_ok


def check_model_files(model_path: Path) -> bool:
    """Check that ML model files exist."""
    models = ["cash_forecast.joblib", "decline_retry.joblib"]
    all_ok = True

    for model in models:
        full_path = model_path / model
        if not full_path.exists():
            console.log(f"[red]FAIL[/red]: Model file missing: {full_path}")
            all_ok = False
        else:
            size_mb = full_path.stat().st_size / (1024 * 1024)
            console.log(f"[green]OK[/green]: {model} exists ({size_mb:.1f} MB)")

    return all_ok


def check_forecast_freshness(conn: Any, max_age_hours: int = 24) -> bool:
    """Check that forecasts were generated recently."""
    result = conn.execute("""
        SELECT MAX(forecast_date) AS latest FROM ml.cash_flow_forecast
    """).fetchone()

    if not result or result[0] is None:
        console.log("[yellow]WARN[/yellow]: No forecasts found (may be first run)")
        return True

    latest = result[0]
    now_date = datetime.now(UTC).date()
    if isinstance(latest, datetime):
        latest = latest.date()
    age_days = (now_date - latest).days
    if age_days >= 1:
        console.log(f"[yellow]WARN[/yellow]: Forecasts are {age_days} days old")
    else:
        console.log(f"[green]OK[/green]: Forecasts fresh (latest: {latest})")

    return True


def check_disk_space(min_gb: float = 1.0) -> bool:
    """Check available disk space."""
    data_dir = Path("/data") if Path("/data").exists() else Path.cwd()
    _total, _used, free = shutil.disk_usage(data_dir)
    free_gb = free / (1024**3)

    if free_gb < min_gb:
        console.log(f"[red]FAIL[/red]: Low disk space: {free_gb:.1f} GB free (min: {min_gb} GB)")
        return False

    console.log(f"[green]OK[/green]: Disk space: {free_gb:.1f} GB free")
    return True


def main():
    parser = argparse.ArgumentParser(description="LedgerFlow health check")
    parser.add_argument(
        "--db-url",
        dest="db_url",
        default=None,
        help="PostgreSQL connection URL (defaults to DATABASE_URL)",
    )
    parser.add_argument("--model-path", type=Path, default=Path("models"))
    args = parser.parse_args()

    console.log(f"Running health check at {datetime.now(UTC).isoformat()}")

    checks = [check_disk_space()]

    try:
        conn = open_direct_conn(normalize_database_url(args.db_url))
        try:
            checks.append(check_table_counts(conn))
            checks.append(check_data_freshness(conn))
            checks.append(check_forecast_freshness(conn))
        finally:
            conn.close()
    except Exception as e:
        console.log(f"[red]FAIL[/red]: PostgreSQL connection failed: {e}")
        checks.append(False)

    checks.append(check_model_files(args.model_path))

    passed = sum(1 for c in checks if c)
    total = len(checks)
    console.log(f"Health summary: {passed}/{total} checks passed")
    if not all(checks):
        sys.exit(1)


if __name__ == "__main__":
    main()
