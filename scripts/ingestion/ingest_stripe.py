#!/usr/bin/env python3
"""
LedgerFlow: Stripe Ingestion Script (Batch Mode)

Fetches recent events from Stripe API and writes normalized transactions to DuckDB.
Designed to run as a nightly cron job.

Usage:
    python scripts/ingestion/ingest_stripe.py --db data/ledgerflow.duckdb --days 1
"""

import argparse
import os
from datetime import datetime, timedelta
from pathlib import Path

import duckdb  # noqa: F401 (kept for direct use if needed)
import stripe
from dotenv import load_dotenv
from rich.console import Console

from scripts.ingestion.common import (
    TYPE_MAP,
    normalize_stripe_event,
    upsert_transactions,
)

load_dotenv()

console = Console()

STRIPE_ACCOUNT_ID = os.getenv("STRIPE_ACCOUNT_ID", "acct_default")


def get_stripe_client() -> stripe.StripeClient:
    """Initialize Stripe client from environment."""
    api_key = os.getenv("STRIPE_SECRET_KEY")
    if not api_key:
        raise ValueError("STRIPE_SECRET_KEY not set in environment")
    return stripe.StripeClient(api_key)


def fetch_events(client: stripe.StripeClient, start: datetime, end: datetime) -> list:
    """Fetch Stripe events in date range."""
    console.log(f"Fetching Stripe events from {start.date()} to {end.date()}")

    events = []
    has_more = True
    starting_after = None

    while has_more:
        params = {
            "created": {"gte": int(start.timestamp()), "lte": int(end.timestamp())},
            "limit": 100,
            "type": list(TYPE_MAP.keys()),
        }
        if starting_after:
            params["starting_after"] = starting_after

        response = client.v1.events.list(params)
        events.extend(response.data)
        has_more = response.has_more
        if has_more:
            starting_after = response.data[-1].id

    console.log(f"Fetched {len(events)} events")
    return events


def main():
    parser = argparse.ArgumentParser(description="Ingest Stripe events to LedgerFlow")
    parser.add_argument("--db", type=Path, default=Path("data/ledgerflow.duckdb"))
    parser.add_argument("--days", type=int, default=1, help="Days of history to fetch")
    parser.add_argument("--dry-run", action="store_true", help="Fetch but don't write")
    args = parser.parse_args()

    console.rule("[bold blue]LedgerFlow Stripe Ingestion[/bold blue]")

    end = datetime.utcnow()
    start = end - timedelta(days=args.days)

    client = get_stripe_client()
    events = fetch_events(client, start, end)

    transactions = []
    for event in events:
        # Convert stripe Event object to plain dict for normalize_stripe_event
        event_dict = event.to_dict() if hasattr(event, "to_dict") else dict(event)
        normalized = normalize_stripe_event(event_dict, STRIPE_ACCOUNT_ID)
        if normalized:
            transactions.append(normalized)

    console.log(f"Normalized {len(transactions)} transactions")

    if args.dry_run:
        console.log("[yellow]Dry run — not writing to database[/yellow]")
        for t in transactions[:5]:
            console.log(
                f"  {t['transaction_id']}: {t['type']} {t['status']} ${t['amount'] / 100:.2f}"
            )
        return

    if transactions:
        count = upsert_transactions(transactions, args.db)
        console.log(f"[green][OK][/green] Written to DuckDB. Total Stripe transactions: {count}")
    else:
        console.log("[yellow]No new transactions to write[/yellow]")

    console.rule("[bold green]Ingestion complete![/bold green]")


if __name__ == "__main__":
    main()
