#!/usr/bin/env python3
"""
LedgerFlow: Calibrate 2026 Monthly Inflows & Outflows

Scales transaction amounts for January to October 2026 so that:
- Every month's Inflows are between $100k and $1,000k (e.g. $420k - $810k).
- Every month's Outflows are between $100k and $1,000k (e.g. $335k - $680k).
- Inflows and Outflows are highly comparable (~75-85% ratio) for clean visual comparisons.
"""

from __future__ import annotations

import argparse

from rich.console import Console
from rich.table import Table

from scripts.db.connection import normalize_database_url, open_direct_conn

console = Console()

# Target monthly totals (all within $100,000 - $1,000,000, comparable proportions)
TARGETS = {
    "2026-01": {"inflows": 420_000.0, "outflows": 335_000.0},
    "2026-02": {"inflows": 460_000.0, "outflows": 370_000.0},
    "2026-03": {"inflows": 510_000.0, "outflows": 410_000.0},
    "2026-04": {"inflows": 550_000.0, "outflows": 450_000.0},
    "2026-05": {"inflows": 600_000.0, "outflows": 490_000.0},
    "2026-06": {"inflows": 640_000.0, "outflows": 530_000.0},
    "2026-07": {"inflows": 680_000.0, "outflows": 560_000.0},
    "2026-08": {"inflows": 720_000.0, "outflows": 600_000.0},
    "2026-09": {"inflows": 760_000.0, "outflows": 640_000.0},
    "2026-10": {"inflows": 810_000.0, "outflows": 680_000.0},
}


def calibrate_flows(db_url: str | None = None) -> None:
    url = normalize_database_url(db_url)
    console.rule(
        "[bold cyan]Calibrating 2026 Monthly Inflows & Outflows ($100k - $1,000k)[/bold cyan]"
    )
    conn = open_direct_conn(url)

    try:
        for month, target in TARGETS.items():
            start_date = f"{month}-01"
            # Next month start
            y, m = map(int, month.split("-"))
            next_start = f"{y + 1}-01-01" if m == 12 else f"{y}-{m + 1:02d}-01"

            # 1. Get current month sums
            inflow_curr = conn.execute(
                """
                SELECT COALESCE(SUM(amount_usd), 0)
                FROM transactions
                WHERE type IN ('charge', 'invoice_payment')
                  AND status = 'succeeded'
                  AND occurred_date >= %s::date AND occurred_date < %s::date
                """,
                [start_date, next_start],
            ).fetchone()[0]

            outflow_curr = conn.execute(
                """
                SELECT COALESCE(SUM(amount_usd), 0)
                FROM transactions
                WHERE type IN ('refund', 'payout', 'fee', 'transfer', 'adjustment')
                  AND status = 'succeeded'
                  AND occurred_date >= %s::date AND occurred_date < %s::date
                """,
                [start_date, next_start],
            ).fetchone()[0]

            inflow_scale = target["inflows"] / float(inflow_curr) if inflow_curr > 0 else 1.0
            outflow_scale = target["outflows"] / float(outflow_curr) if outflow_curr > 0 else 1.0

            # 2. Update inflows
            conn.execute(
                """
                UPDATE transactions
                SET
                    amount = ROUND(amount * %s),
                    net_amount = ROUND(net_amount * %s),
                    fee_amount = ROUND(fee_amount * %s)
                WHERE type IN ('charge', 'invoice_payment')
                  AND occurred_date >= %s::date AND occurred_date < %s::date
                """,
                [inflow_scale, inflow_scale, inflow_scale, start_date, next_start],
            )

            # 3. Update outflows
            conn.execute(
                """
                UPDATE transactions
                SET
                    amount = ROUND(amount * %s),
                    net_amount = ROUND(net_amount * %s),
                    fee_amount = ROUND(fee_amount * %s)
                WHERE type IN ('refund', 'payout', 'fee', 'transfer', 'adjustment')
                  AND occurred_date >= %s::date AND occurred_date < %s::date
                """,
                [outflow_scale, outflow_scale, outflow_scale, start_date, next_start],
            )

        # Print verification table
        table = Table(title="Calibrated Jan - Oct 2026 Monthly Cash Flows (All $100k - $1,000k)")
        table.add_column("Month", style="cyan")
        table.add_column("Inflows ($)", style="green", justify="right")
        table.add_column("Outflows ($)", style="red", justify="right")
        table.add_column("Net Cash Flow ($)", style="bold yellow", justify="right")
        table.add_column("Outflow/Inflow Ratio", style="magenta", justify="right")

        verify_query = """
            SELECT
                TO_CHAR(occurred_date, 'YYYY-MM') as month,
                COALESCE(SUM(CASE WHEN net_amount_usd > 0 THEN net_amount_usd ELSE 0 END), 0) as inflows,
                COALESCE(SUM(CASE WHEN net_amount_usd < 0 THEN -net_amount_usd ELSE 0 END), 0) as outflows,
                COALESCE(SUM(net_amount_usd), 0) as net_flow
            FROM transactions
            WHERE occurred_date >= '2026-01-01' AND occurred_date <= '2026-10-31'
              AND status = 'succeeded'
            GROUP BY TO_CHAR(occurred_date, 'YYYY-MM')
            ORDER BY month;
        """
        rows = conn.execute(verify_query).fetchall()
        for r in rows:
            m_str, inf, outf, net = r[0], float(r[1]), float(r[2]), float(r[3])
            ratio = f"{(outf / inf * 100):.1f}%" if inf > 0 else "N/A"
            table.add_row(
                m_str,
                f"${inf:,.2f}",
                f"${outf:,.2f}",
                f"${net:,.2f}",
                ratio,
            )

        console.print(table)
        console.rule("[bold green]Calibration Complete![/bold green]")
    finally:
        conn.close()


def main():
    parser = argparse.ArgumentParser(description="Calibrate 2026 monthly inflows & outflows")
    parser.add_argument("--db-url", default=None, help="Target PostgreSQL connection URL")
    args = parser.parse_args()

    calibrate_flows(db_url=args.db_url)


if __name__ == "__main__":
    main()
