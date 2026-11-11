#!/usr/bin/env python3
"""
LedgerFlow: Plaid Bank Feed Ingestion (Batch Mode)

Fetches transactions from Plaid (bank feeds) and writes normalized transactions to PostgreSQL.
Designed to run as a nightly cron job.

Usage:
    python -m scripts.ingestion.ingest_plaid --days 1
"""

from __future__ import annotations

import argparse
import os

import plaid
from plaid.api import plaid_api
from plaid.model.transactions_sync_request import TransactionsSyncRequest
from rich.console import Console

from scripts.ingestion.common import normalize_plaid_transaction, upsert_transactions

console = Console()


def get_plaid_client() -> plaid_api.PlaidApi:
    """Initialize Plaid client from environment."""
    client_id = os.getenv("PLAID_CLIENT_ID")
    secret = os.getenv("PLAID_SECRET")
    env = os.getenv("PLAID_ENV", "sandbox")

    if not client_id or not secret:
        raise ValueError("PLAID_CLIENT_ID and PLAID_SECRET must be set")

    host_map = {
        "sandbox": plaid.Environment.Sandbox,
        "development": plaid.Environment.Development,
        "production": plaid.Environment.Production,
    }

    configuration = plaid.Configuration(
        host=host_map.get(env, plaid.Environment.Sandbox),
        api_key={"clientId": client_id, "secret": secret},
    )

    api_client = plaid.ApiClient(configuration)
    return plaid_api.PlaidApi(api_client)


def get_access_tokens() -> list[str]:
    """Get stored access tokens from environment (comma-separated)."""
    tokens = os.getenv("PLAID_ACCESS_TOKENS", "")
    return [t.strip() for t in tokens.split(",") if t.strip()]


def fetch_transactions(client: plaid_api.PlaidApi, access_token: str, cursor: str | None = None):
    """Fetch all transactions for an access token using /transactions/sync."""
    all_transactions = []
    has_more = True
    current_cursor = cursor

    while has_more:
        request = TransactionsSyncRequest(
            access_token=access_token,
            cursor=current_cursor,
            count=500,
        )
        response = client.transactions_sync(request)
        all_transactions.extend(response.added)
        all_transactions.extend(response.modified)
        has_more = response.has_more
        current_cursor = response.next_cursor

    return all_transactions, current_cursor


def write_to_db(transactions: list[dict], db_url: str | None = None) -> int:
    """Upsert transactions into PostgreSQL using shared function."""
    return upsert_transactions(transactions, db_url)


def main():
    parser = argparse.ArgumentParser(description="Ingest Plaid bank transactions to LedgerFlow")
    parser.add_argument(
        "--db-url",
        dest="db_url",
        default=None,
        help="PostgreSQL connection URL (defaults to DATABASE_URL)",
    )
    parser.add_argument(
        "--days", type=int, default=1, help="Days of history to fetch (Plaid sync is incremental)"
    )
    parser.add_argument("--dry-run", action="store_true", help="Fetch but don't write")
    args = parser.parse_args()

    console.rule("[bold blue]LedgerFlow Plaid Ingestion[/bold blue]")

    client = get_plaid_client()
    access_tokens = get_access_tokens()

    if not access_tokens:
        console.log("[yellow]No PLAID_ACCESS_TOKENS configured - skipping[/yellow]")
        return

    console.log(f"Fetching transactions for {len(access_tokens)} institution(s)...")

    all_transactions = []
    for token in access_tokens:
        try:
            txns, _cursor = fetch_transactions(client, token)
            console.log(f"  Fetched {len(txns)} transactions from token {token[:8]}...")

            for txn in txns:
                normalized = normalize_plaid_transaction(txn, token)
                if normalized:
                    all_transactions.append(normalized)
        except Exception as e:
            console.log(f"[red]Error fetching from {token[:8]}: {e}[/red]")

    console.log(f"Normalized {len(all_transactions)} transactions")

    if args.dry_run:
        console.log("[yellow]Dry run - not writing to database[/yellow]")
        for t in all_transactions[:5]:
            console.log(
                f"  {t['transaction_id']}: {t['type']} ${t['amount'] / 100:.2f} {t['description'][:50]}"
            )
        return

    if all_transactions:
        count = write_to_db(all_transactions, args.db_url)
        console.log(f"[green][OK][/green] Written to PostgreSQL. Total Plaid transactions: {count}")
    else:
        console.log("[yellow]No new transactions to write[/yellow]")

    console.rule("[bold green]Plaid ingestion complete![/bold green]")


if __name__ == "__main__":
    main()
