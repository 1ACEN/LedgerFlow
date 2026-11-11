#!/usr/bin/env python3
"""
LedgerFlow: Nightly Reconciliation (PostgreSQL)

Compares Stripe payouts vs bank deposits, identifies discrepancies,
and flags unreconciled items for review.

Usage:
    python -m scripts.ingestion.reconcile --days 7
"""

from __future__ import annotations

import argparse

from rich.console import Console
from rich.table import Table

from scripts.db.connection import normalize_database_url, open_direct_conn, read_polars

console = Console()


def main():
    parser = argparse.ArgumentParser(description="Run nightly reconciliation")
    parser.add_argument(
        "--db-url",
        dest="db_url",
        default=None,
        help="PostgreSQL connection URL (defaults to DATABASE_URL)",
    )
    parser.add_argument("--days", type=int, default=7, help="Lookback window for reconciliation")
    args = parser.parse_args()

    console.rule("[bold blue]LedgerFlow Nightly Reconciliation[/bold blue]")

    conn = open_direct_conn(normalize_database_url(args.db_url))

    try:
        console.log("Checking Stripe payouts vs bank deposits...")

        query = f"""
            WITH stripe_payouts AS (
                SELECT
                    transaction_id,
                    posted_date,
                    net_amount_usd,
                    description
                FROM transactions
                WHERE source = 'stripe'
                  AND type = 'payout'
                  AND status = 'succeeded'
                  AND posted_date >= CURRENT_DATE - INTERVAL '{args.days} days'
            ),
            bank_deposits AS (
                SELECT
                    transaction_id,
                    posted_date,
                    net_amount_usd,
                    description,
                    metadata_json
                FROM transactions
                WHERE source = 'plaid'
                  AND net_amount_usd > 0
                  AND posted_date >= CURRENT_DATE - INTERVAL '{args.days} days'
            ),
            matched AS (
                SELECT
                    sp.transaction_id AS stripe_txn_id,
                    bd.transaction_id AS bank_txn_id,
                    sp.posted_date AS stripe_date,
                    bd.posted_date AS bank_date,
                    ABS(sp.net_amount_usd) AS stripe_amount,
                    bd.net_amount_usd AS bank_amount,
                    ABS(sp.net_amount_usd) - bd.net_amount_usd AS diff_usd,
                    CASE
                        WHEN ABS(ABS(sp.net_amount_usd) - bd.net_amount_usd) < 0.01 THEN 'matched'
                        WHEN ABS(ABS(sp.net_amount_usd) - bd.net_amount_usd) < 1.00 THEN 'minor_diff'
                        ELSE 'major_diff'
                    END AS match_status
                FROM stripe_payouts sp
                LEFT JOIN bank_deposits bd
                    ON bd.posted_date BETWEEN sp.posted_date AND sp.posted_date + INTERVAL '2 days'
                   AND ABS(bd.net_amount_usd - ABS(sp.net_amount_usd)) < 1000
                WHERE bd.transaction_id IS NOT NULL
            ),
            unmatched_stripe AS (
                SELECT * FROM stripe_payouts sp
                WHERE NOT EXISTS (
                    SELECT 1 FROM bank_deposits bd
                    WHERE bd.posted_date BETWEEN sp.posted_date AND sp.posted_date + INTERVAL '2 days'
                      AND ABS(bd.net_amount_usd - ABS(sp.net_amount_usd)) < 1000
                )
            ),
            unmatched_bank AS (
                SELECT * FROM bank_deposits bd
                WHERE NOT EXISTS (
                    SELECT 1 FROM stripe_payouts sp
                    WHERE bd.posted_date BETWEEN sp.posted_date AND sp.posted_date + INTERVAL '2 days'
                      AND ABS(bd.net_amount_usd - ABS(sp.net_amount_usd)) < 1000
                )
            )
            SELECT 'matched' AS category, COUNT(*) AS count, SUM(diff_usd) AS total_diff FROM matched
            UNION ALL
            SELECT 'unmatched_stripe', COUNT(*), SUM(net_amount_usd) FROM unmatched_stripe
            UNION ALL
            SELECT 'unmatched_bank', COUNT(*), SUM(net_amount_usd) FROM unmatched_bank
        """

        summary = read_polars(conn, query)
        console.log("Reconciliation Summary:")
        for row in summary.iter_rows(named=True):
            console.log(
                f"  {row['category']}: {row['count']} items, ${row['total_diff'] or 0:,.2f}"
            )

        detail_query = f"""
            SELECT
                sp.transaction_id AS stripe_txn_id,
                bd.transaction_id AS bank_txn_id,
                sp.posted_date AS stripe_date,
                bd.posted_date AS bank_date,
                ABS(sp.net_amount_usd) AS stripe_amount,
                bd.net_amount_usd AS bank_amount,
                ABS(sp.net_amount_usd) - bd.net_amount_usd AS diff_usd
            FROM transactions sp
            LEFT JOIN transactions bd
                ON bd.source = 'plaid'
               AND bd.net_amount_usd > 0
               AND bd.posted_date BETWEEN sp.posted_date AND sp.posted_date + INTERVAL '2 days'
               AND ABS(bd.net_amount_usd - ABS(sp.net_amount_usd)) < 1000
            WHERE sp.source = 'stripe'
              AND sp.type = 'payout'
              AND sp.status = 'succeeded'
              AND sp.posted_date >= CURRENT_DATE - INTERVAL '{args.days} days'
              AND (bd.transaction_id IS NULL OR ABS(ABS(sp.net_amount_usd) - bd.net_amount_usd) >= 1.00)
            ORDER BY ABS(ABS(sp.net_amount_usd) - COALESCE(bd.net_amount_usd, 0)) DESC
        """

        discrepancies = read_polars(conn, detail_query)

        if len(discrepancies) > 0:
            console.log(f"\n[red]Found {len(discrepancies)} discrepancies:[/red]")
            table = Table(title="Payout Discrepancies")
            table.add_column("Stripe Txn ID")
            table.add_column("Stripe Date")
            table.add_column("Stripe Amount")
            table.add_column("Bank Txn ID")
            table.add_column("Bank Date")
            table.add_column("Bank Amount")
            table.add_column("Difference")

            for row in discrepancies.head(20).iter_rows(named=True):
                table.add_row(
                    row["stripe_txn_id"],
                    str(row["stripe_date"]),
                    f"${row['stripe_amount']:,.2f}",
                    row["bank_txn_id"] or "—",
                    str(row["bank_date"]) if row["bank_date"] else "—",
                    f"${row['bank_amount']:,.2f}" if row["bank_amount"] else "—",
                    f"${row['diff_usd']:,.2f}" if row["diff_usd"] is not None else "—",
                )
            console.print(table)
        else:
            console.log("[green]No significant discrepancies found[/green]")

        console.log("\nChecking for duplicate transactions...")
        dup_query = """
            SELECT
                idempotency_key,
                COUNT(*) AS count,
                MIN(ingested_at) AS first_ingested,
                MAX(ingested_at) AS last_ingested
            FROM transactions
            WHERE idempotency_key IS NOT NULL
            GROUP BY idempotency_key
            HAVING COUNT(*) > 1
        """
        duplicates = read_polars(conn, dup_query)
        if len(duplicates) > 0:
            console.log(f"[yellow]Found {len(duplicates)} duplicate idempotency keys[/yellow]")
        else:
            console.log("[green]No duplicate transactions[/green]")

        console.log("\nChecking for transactions missing posted_date...")
        missing_posted = conn.execute("""
            SELECT COUNT(*) FROM transactions
            WHERE posted_date IS NULL AND status = 'succeeded'
        """).fetchone()[0]
        if missing_posted > 0:
            console.log(
                f"[yellow]{missing_posted} succeeded transactions missing posted_date[/yellow]"
            )
        else:
            console.log("[green]All succeeded transactions have posted_date[/green]")

        console.log("\nChecking accrual/cash basis consistency...")
        basis_check = read_polars(
            conn,
            """
            SELECT
                basis,
                COUNT(*) AS count,
                SUM(amount_usd) AS total_usd
            FROM transactions
            WHERE occurred_date >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY basis
            """,
        )
        for row in basis_check.iter_rows(named=True):
            console.log(f"  {row['basis']}: {row['count']} txns, ${row['total_usd'] or 0:,.2f}")
    finally:
        conn.close()

    console.rule("[bold green]Reconciliation complete![/bold green]")


if __name__ == "__main__":
    main()
