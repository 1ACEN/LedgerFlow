#!/usr/bin/env python3
"""
LedgerFlow: Health Check Script

Runs every 15 minutes via cron to verify system health.
Exits with non-zero code if any check fails (triggers alerting).

Usage:
    python scripts/health_check.py --db data/ledgerflow.duckdb
"""

import argparse
import sys
from datetime import datetime, timedelta
from pathlib import Path

import duckdb
from rich.console import Console

console = Console()


def check_data_freshness(conn: duckdb.DuckDBPyConnection, max_age_hours: int = 48) -> bool:
    """Check that we have recent transaction data."""
    result = conn.execute("""
        SELECT MAX(occurred_at) as latest FROM transactions
    """).fetchone()

    if not result or result[0] is None:
        console.log("[red]FAIL[/red]: No transaction data found")
        return False

    latest = result[0]
    age = datetime.utcnow() - latest
    if age > timedelta(hours=max_age_hours):
        console.log(f"[red]FAIL[/red]: Data is stale (latest: {latest}, age: {age})")
        return False

    console.log(f"[green]OK[/green]: Data fresh (latest: {latest}, age: {age})")
    return True


def check_table_counts(conn: duckdb.DuckDBPyConnection) -> bool:
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


def check_forecast_freshness(conn: duckdb.DuckDBPyConnection, max_age_hours: int = 24) -> bool:
    """Check that forecasts were generated recently."""
    result = conn.execute("""
        SELECT MAX(forecast_date) as latest FROM ml.cash_flow_forecast
    """).fetchone()

    if not result or result[0] is None:
        console.log("[yellow]WARN[/yellow]: No forecasts found (may be first run)")
        return True  # Not a hard failure

    latest = result[0]
    age = datetime.utcnow().date() - latest
    if age.days >= 1:
        console.log(f"[yellow]WARN[/yellow]: Forecasts are {age.days} days old")
    else:
        console.log(f"[green]OK[/green]: Forecasts fresh (latest: {latest})")

    return True


def check_disk_space(min_gb: float = 1.0) -> bool:
    """Check available disk space."""
    import shutil

    data_dir = Path("/data") if Path("/data").exists() else Path.cwd()
    total, used, free = shutil.disk_usage(data_dir)
    free_gb = free / (1024**3)

    if free_gb < min_gb:
        console.log(f"[red]FAIL[/red]: Low disk space: {free_gb:.1f} GB free (min: {min_gb} GB)")
        return False

    console.log(f"[green]OK[/green]: Disk space: {free_gb:.1f} GB free")
    return True


def main():
    parser = argparse.ArgumentParser(description="LedgerFlow health check")
    parser.add_argument("--db", type=Path, default=Path("data/ledgerflow.duckdb"))
    parser.add_argument("--model-path", type=Path, default=Path("models"))
    args = parser.parse_args()

    console.log(f"Running health check at {datetime.utcnow().isoformat()}")

    checks = []

    # Disk space
    checks.append(check_disk_space())

    # Database checks
    if args.db.exists():
        conn = duckdb.connect(str(args.db), read_only=True)
        checks.append(check_table_counts(conn))
        checks.append(check_data_freshness(conn))
        checks.append(check_forecast_freshness(conn))
        conn.close()
    else:
        console.log(f"[red]FAIL[/red]: Database not found at {args.db}")
        checks.append(False)

    # Model files
    checks.append(check_model_files(args.model_path))

    # Summary
    passed = sum(checks)
    total = len(checks)

    console.log(f"\nHealth check: {passed}/{total} passed")

    if passed == total:
        console.log("[green]All checks passed[/green]")
        sys.exit(0)
    else:
        console.log("[red]Some checks failed[/red]")
        sys.exit(1)


if __name__ == "__main__":
    main()
