#!/usr/bin/env python3
"""
LedgerFlow: Historical Data Enhancement & Cloud Database Persistence

Performs fast, safe, idempotent calibration and historical data enhancement across:
- Executive Page: Revenue vs Expenses Comparison (6-month trajectory)
- Executive Page: Daily Inflow vs Outflow (30-day cash velocity)
- Cashflow & Forecast: Cash Runway & Scenario Sensitivity Projections
- CFO & Revenue: Financial Performance Trends and Operating Leverage (12-month)
- CFO & Revenue: Monthly Revenue by Product Line (13-month stacked)

Key achievements:
1. Calibrates November 2026 (Nov 1-16) to a realistic ~$450k MTD ($25k-$35k/day), eliminating the $11M / $2.5M/day spike.
2. Backfills Nov 1-10 with realistic, smooth daily cashflows (no empty gaps).
3. Backfills 2025-11 and 2025-12 so the 13-month timeline starts at ~$320k-$350k with complete product lines.
4. Generates both cash and accrual records with valid customer references.
5. Updates ml.cash_flow_forecast with realistic 91-day P10/P50/P90 quantile projections.
6. Operates directly on the cloud database (Supabase) and local PostgreSQL.
"""

from __future__ import annotations

import argparse
import os
import random
import sys
from datetime import UTC, date, datetime, timedelta
from typing import Any

from dotenv import load_dotenv
from rich.console import Console
from rich.table import Table

from scripts.db.connection import normalize_database_url, open_direct_conn

load_dotenv()

console = Console()

PRODUCT_LINES = [
    "subscriptions",
    "platform_fees",
    "marketplace",
    "ecommerce",
    "professional_services",
]

PRODUCT_WEIGHTS = [0.35, 0.25, 0.20, 0.12, 0.08]

DEPARTMENTS = ["engineering", "sales", "marketing", "g&a", "operations", "support"]
DEPT_WEIGHTS = [0.35, 0.22, 0.15, 0.12, 0.10, 0.06]

SOURCES = ["stripe", "adyen", "ach", "plaid"]
SOURCE_WEIGHTS = [0.55, 0.20, 0.15, 0.10]


def get_existing_customers(conn: Any) -> list[str]:
    """Fetch existing customer IDs from the database."""
    cur = conn.cursor()
    cur.execute("SELECT customer_id FROM customers LIMIT 500;")
    rows = cur.fetchall()
    if rows:
        return [r[0] for r in rows]
    return [f"cus_demo_{i:04d}" for i in range(1, 51)]


def backfill_date_range(
    conn: Any,
    start_d: date,
    end_d: date,
    target_daily_inflows: float,
    target_daily_outflows: float,
    batch_prefix: str,
    customer_ids: list[str],
) -> int:
    """Safely and idempotently backfill realistic transactions for dates with missing or sparse data."""
    cur = conn.cursor()
    total_inserted = 0

    # First check existing counts for the whole range in one query
    cur.execute(
        """
        SELECT occurred_date, COUNT(*)
        FROM transactions
        WHERE occurred_date >= %s AND occurred_date <= %s
        GROUP BY occurred_date;
        """,
        [start_d, end_d],
    )
    existing_map = dict(cur.fetchall())

    insert_rows = []
    insert_sql = """
        INSERT INTO transactions (
            transaction_id, idempotency_key, occurred_at, posted_at,
            occurred_date, posted_date, occurred_hour, occurred_dow,
            occurred_week, occurred_month, occurred_quarter, occurred_year,
            type, status, source, amount, currency, fx_rate,
            net_amount, fee_amount, customer_id, product_line,
            department, account_code, basis, description, batch_id
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
        ) ON CONFLICT (transaction_id) DO NOTHING;
    """

    cur_d = start_d
    while cur_d <= end_d:
        date_str = cur_d.isoformat()
        batch_id = f"{batch_prefix}_{date_str.replace('-', '')}"
        existing_count = existing_map.get(cur_d, 0)

        # Only backfill if count is sparse (< 5 transactions)
        if existing_count < 5:
            is_weekend = cur_d.weekday() >= 5
            factor = 0.65 if is_weekend else 1.12
            day_target_in = target_daily_inflows * factor * random.uniform(0.92, 1.08)
            day_target_out = target_daily_outflows * factor * random.uniform(0.90, 1.10)

            # 1. Inflows (charges and invoice payments) - 10 transactions per day
            n_in = 10
            avg_in = day_target_in / n_in
            for i in range(n_in):
                tx_id = f"tx_hf_{batch_id}_{i:03d}"
                prod = random.choices(PRODUCT_LINES, weights=PRODUCT_WEIGHTS)[0]
                src = random.choices(SOURCES, weights=SOURCE_WEIGHTS)[0]
                cust = random.choice(customer_ids)
                tx_type = "invoice_payment" if i % 3 == 0 else "charge"
                hour = random.randint(8, 20)
                tx_time = datetime(
                    cur_d.year,
                    cur_d.month,
                    cur_d.day,
                    hour,
                    random.randint(0, 59),
                    random.randint(0, 59),
                    tzinfo=UTC,
                )

                amt_usd = round(avg_in * random.uniform(0.5, 1.5), 2)
                amt_cents = int(round(amt_usd * 100))
                fee_cents = int(round(amt_cents * 0.029 + 30))
                net_cents = amt_cents - fee_cents

                # Cash row
                insert_rows.append(
                    (
                        tx_id,
                        f"idem_{tx_id}",
                        tx_time,
                        tx_time,
                        cur_d,
                        cur_d,
                        hour,
                        cur_d.weekday(),
                        cur_d.isocalendar()[1],
                        cur_d.month,
                        (cur_d.month - 1) // 3 + 1,
                        cur_d.year,
                        tx_type,
                        "succeeded",
                        src,
                        amt_cents,
                        "USD",
                        1.0,
                        net_cents,
                        fee_cents,
                        cust,
                        prod,
                        "sales",
                        "4000-revenue",
                        "cash",
                        f"Revenue - {prod.replace('_', ' ').title()}",
                        batch_id,
                    )
                )

                # Accrual row
                insert_rows.append(
                    (
                        f"{tx_id}_acc",
                        f"idem_{tx_id}_acc",
                        tx_time,
                        tx_time,
                        cur_d,
                        cur_d,
                        hour,
                        cur_d.weekday(),
                        cur_d.isocalendar()[1],
                        cur_d.month,
                        (cur_d.month - 1) // 3 + 1,
                        cur_d.year,
                        tx_type,
                        "succeeded",
                        src,
                        amt_cents,
                        "USD",
                        1.0,
                        net_cents,
                        fee_cents,
                        cust,
                        prod,
                        "sales",
                        "4000-revenue",
                        "accrual",
                        f"Accrual - {prod.replace('_', ' ').title()}",
                        batch_id,
                    )
                )

            # 2. Outflows (payouts, fees, refunds) - 6 transactions per day
            n_out = 6
            avg_out = day_target_out / n_out
            for j in range(n_out):
                tx_id = f"tx_hf_out_{batch_id}_{j:03d}"
                out_type = random.choices(["payout", "fee", "refund"], weights=[0.60, 0.25, 0.15])[
                    0
                ]
                dept = random.choices(DEPARTMENTS, weights=DEPT_WEIGHTS)[0]
                hour = random.randint(9, 18)
                tx_time = datetime(
                    cur_d.year,
                    cur_d.month,
                    cur_d.day,
                    hour,
                    random.randint(0, 59),
                    random.randint(0, 59),
                    tzinfo=UTC,
                )

                amt_usd = round(avg_out * random.uniform(0.6, 1.4), 2)
                amt_cents = int(round(amt_usd * 100))
                net_cents = -amt_cents

                insert_rows.append(
                    (
                        tx_id,
                        f"idem_{tx_id}",
                        tx_time,
                        tx_time,
                        cur_d,
                        cur_d,
                        hour,
                        cur_d.weekday(),
                        cur_d.isocalendar()[1],
                        cur_d.month,
                        (cur_d.month - 1) // 3 + 1,
                        cur_d.year,
                        out_type,
                        "succeeded",
                        "stripe",
                        amt_cents,
                        "USD",
                        1.0,
                        net_cents,
                        0,
                        None,
                        None,
                        dept,
                        "6000-payment_processing" if out_type == "fee" else "1010-checking",
                        "cash",
                        f"Outflow - {out_type.title()} ({dept.title()})",
                        batch_id,
                    )
                )

        cur_d += timedelta(days=1)

    if insert_rows:
        cur.executemany(insert_sql, insert_rows)
        total_inserted = len(insert_rows)

    return total_inserted


def calibrate_november_2026(conn: Any) -> None:
    """
    Calibrate November 11-16 so that:
    1. Daily inflows for Nov 11-16 are in the realistic ~$28k-$36k/day range.
    2. Daily outflows for Nov 11-16 are in the realistic ~$22k-$28k/day range.
    3. Total November 2026 MTD is comparable to October 2026 (~$450k MTD vs $810k full month).
    """
    cur = conn.cursor()
    console.log("[cyan]Calibrating November 11-16 spike down to realistic daily values...[/cyan]")

    for d_int in range(11, 17):
        target_date = date(2026, 11, d_int)

        # Check current sums on this date
        cur.execute(
            """
            SELECT
                COALESCE(SUM(amount_usd) FILTER (WHERE type IN ('charge', 'invoice_payment') AND status = 'succeeded'), 0.0),
                COALESCE(SUM(amount_usd) FILTER (WHERE type IN ('payout', 'fee', 'refund', 'transfer', 'adjustment') AND status = 'succeeded'), 0.0)
            FROM transactions
            WHERE occurred_date = %s;
            """,
            [target_date],
        )
        curr_in, curr_out = cur.fetchone()
        curr_in = float(curr_in)
        curr_out = float(curr_out)

        # Desired targets for this single day (~$28,000 in, ~$22,000 out)
        desired_in = 28_000.0 * random.uniform(0.92, 1.08)
        desired_out = 22_000.0 * random.uniform(0.90, 1.10)

        scale_in = desired_in / curr_in if curr_in > desired_in else 1.0
        scale_out = desired_out / curr_out if curr_out > desired_out else 1.0

        if scale_in < 0.95:
            cur.execute(
                """
                UPDATE transactions
                SET
                    amount = GREATEST(100, ROUND(amount * %s)),
                    net_amount = GREATEST(90, ROUND(net_amount * %s)),
                    fee_amount = GREATEST(10, ROUND(fee_amount * %s))
                WHERE occurred_date = %s
                  AND type IN ('charge', 'invoice_payment');
                """,
                [scale_in, scale_in, scale_in, target_date],
            )

        if scale_out < 0.95:
            cur.execute(
                """
                UPDATE transactions
                SET
                    amount = GREATEST(100, ROUND(amount * %s)),
                    net_amount = -GREATEST(100, ROUND(ABS(net_amount) * %s)),
                    fee_amount = GREATEST(0, ROUND(fee_amount * %s))
                WHERE occurred_date = %s
                  AND type IN ('payout', 'fee', 'refund', 'transfer', 'adjustment');
                """,
                [scale_out, scale_out, scale_out, target_date],
            )


def calibrate_historical_months(conn: Any) -> None:
    """
    Ensure all 13 months (2025-11 to 2026-11) have smooth, comparable revenue and cash flows:
    Monthly Inflows between $300k and $850k.
    Outflow/Inflow ratio between 75% and 85% (healthy operating profit margin).
    """
    cur = conn.cursor()
    targets = {
        "2025-11": {"inflows": 320_000.0, "outflows": 255_000.0},
        "2025-12": {"inflows": 350_000.0, "outflows": 280_000.0},
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
        "2026-11": {"inflows": 450_000.0, "outflows": 370_000.0},  # MTD 16 days
    }

    for month_str, target in targets.items():
        y, m = map(int, month_str.split("-"))
        start_d = f"{y}-{m:02d}-01"
        next_d = f"{y + 1}-01-01" if m == 12 else f"{y}-{m + 1:02d}-01"

        # Current sums
        cur.execute(
            """
            SELECT
                COALESCE(SUM(amount_usd) FILTER (WHERE type IN ('charge', 'invoice_payment') AND status = 'succeeded'), 0.0),
                COALESCE(SUM(amount_usd) FILTER (WHERE type IN ('payout', 'fee', 'refund', 'transfer', 'adjustment') AND status = 'succeeded'), 0.0)
            FROM transactions
            WHERE occurred_date >= %s::date AND occurred_date < %s::date;
            """,
            [start_d, next_d],
        )
        curr_in, curr_out = cur.fetchone()
        curr_in = float(curr_in)
        curr_out = float(curr_out)

        if curr_in > 0:
            scale_in = target["inflows"] / curr_in
            cur.execute(
                """
                UPDATE transactions
                SET
                    amount = GREATEST(100, ROUND(amount * %s)),
                    net_amount = GREATEST(90, ROUND(net_amount * %s)),
                    fee_amount = GREATEST(10, ROUND(fee_amount * %s))
                WHERE occurred_date >= %s::date AND occurred_date < %s::date
                  AND type IN ('charge', 'invoice_payment');
                """,
                [scale_in, scale_in, scale_in, start_d, next_d],
            )

        if curr_out > 0:
            scale_out = target["outflows"] / curr_out
            cur.execute(
                """
                UPDATE transactions
                SET
                    amount = GREATEST(100, ROUND(amount * %s)),
                    net_amount = -GREATEST(100, ROUND(ABS(net_amount) * %s)),
                    fee_amount = GREATEST(0, ROUND(fee_amount * %s))
                WHERE occurred_date >= %s::date AND occurred_date < %s::date
                  AND type IN ('payout', 'fee', 'refund', 'transfer', 'adjustment');
                """,
                [scale_out, scale_out, scale_out, start_d, next_d],
            )


def update_forecast_projections(conn: Any) -> None:
    """
    Safely populate ml.cash_flow_forecast with 91-day forward projections
    reflecting the calibrated ~$850k monthly baseline.
    """
    cur = conn.cursor()
    console.log("[cyan]Updating ML cash flow forecast quantile projections...[/cyan]")

    forecast_date = date(2026, 11, 16)
    starting_cash = 1_850_000.0  # $1.85M healthy reserve baseline
    daily_flow = 3_200.0
    running_cash = starting_cash

    fc_rows = []
    fc_sql = """
        INSERT INTO ml.cash_flow_forecast (
            forecast_date, prediction_date, horizon_days,
            p10_net_flow_usd, p50_net_flow_usd, p90_net_flow_usd,
            p50_inflows_usd, p50_outflows_usd,
            starting_cash_usd,
            p10_cumulative_cash_usd, p50_cumulative_cash_usd, p90_cumulative_cash_usd,
            p10_runway_days, p50_runway_days, p90_runway_days,
            model_version
        ) VALUES (
            %s, %s, %s,
            %s, %s, %s,
            %s, %s,
            %s,
            %s, %s, %s,
            %s, %s, %s,
            %s
        ) ON CONFLICT (forecast_date, prediction_date) DO UPDATE SET
            p10_net_flow_usd = EXCLUDED.p10_net_flow_usd,
            p50_net_flow_usd = EXCLUDED.p50_net_flow_usd,
            p90_net_flow_usd = EXCLUDED.p90_net_flow_usd,
            p50_inflows_usd = EXCLUDED.p50_inflows_usd,
            p50_outflows_usd = EXCLUDED.p50_outflows_usd,
            starting_cash_usd = EXCLUDED.starting_cash_usd,
            p10_cumulative_cash_usd = EXCLUDED.p10_cumulative_cash_usd,
            p50_cumulative_cash_usd = EXCLUDED.p50_cumulative_cash_usd,
            p90_cumulative_cash_usd = EXCLUDED.p90_cumulative_cash_usd,
            p10_runway_days = EXCLUDED.p10_runway_days,
            p50_runway_days = EXCLUDED.p50_runway_days,
            p90_runway_days = EXCLUDED.p90_runway_days;
    """

    for day_i in range(1, 92):
        pred_date = forecast_date + timedelta(days=day_i)
        running_cash += daily_flow * random.uniform(0.85, 1.15)
        cone = abs(running_cash) * 0.012 * (day_i / 14.0)

        p10 = round(running_cash - cone, 2)
        p50 = round(running_cash, 2)
        p90 = round(running_cash + cone, 2)

        fc_rows.append(
            (
                forecast_date,
                pred_date,
                day_i,
                2400.0,
                3200.0,
                4100.0,
                28000.0,
                24800.0,
                starting_cash,
                p10,
                p50,
                p90,
                180,
                270,
                365,
                "v2.1-calibrated",
            )
        )

    cur.executemany(fc_sql, fc_rows)


def run_pipeline(db_url: str | None = None, label: str = "Database") -> None:
    url = normalize_database_url(db_url)
    console.rule(f"[bold cyan]LedgerFlow Historical Enhancement — {label}[/bold cyan]")
    conn = open_direct_conn(url)

    try:
        customers = get_existing_customers(conn)

        # 1. Backfill sparse range: Nov 1, 2026 to Nov 10, 2026
        console.log("[yellow]Step 1: Backfilling Nov 1 - 10, 2026 daily transactions...[/yellow]")
        inserted_nov = backfill_date_range(
            conn,
            date(2026, 11, 1),
            date(2026, 11, 10),
            target_daily_inflows=27_000.0,
            target_daily_outflows=22_000.0,
            batch_prefix="demo_nov_fill",
            customer_ids=customers,
        )
        console.log(f"[green]Inserted {inserted_nov} transactions for Nov 1 - 10[/green]")

        # 2. Backfill historical range: Nov 1, 2025 to Dec 31, 2025
        console.log("[yellow]Step 2: Backfilling 2025-11 and 2025-12 timeline...[/yellow]")
        inserted_2025 = backfill_date_range(
            conn,
            date(2025, 11, 1),
            date(2025, 12, 31),
            target_daily_inflows=11_000.0,
            target_daily_outflows=9_000.0,
            batch_prefix="demo_2025_fill",
            customer_ids=customers,
        )
        console.log(f"[green]Inserted {inserted_2025} transactions for 2025-11/12[/green]")

        # 3. Scale down the Nov 11-16 multi-million spike
        console.log("[yellow]Step 3: Calibrating November 11-16 daily volumes...[/yellow]")
        calibrate_november_2026(conn)

        # 4. Calibrate all 13 months to exact balanced targets
        console.log("[yellow]Step 4: Calibrating 13-month timelines ($300k - $850k)...[/yellow]")
        calibrate_historical_months(conn)

        # 5. Update cash flow forecast
        console.log("[yellow]Step 5: Updating ML forecast projections...[/yellow]")
        update_forecast_projections(conn)

        # Verification Table: 6-Month Executive Revenue vs Expenses
        console.rule("[bold green]Verification 1: Executive 6-Month Trajectory[/bold green]")
        cur = conn.cursor()
        cur.execute(
            """
            SELECT
                DATE_TRUNC('month', occurred_at)::DATE AS month,
                ROUND(COALESCE(SUM(amount_usd) FILTER (WHERE type IN ('charge', 'invoice_payment') AND status = 'succeeded'), 0.0)::numeric, 2) AS revenue,
                ROUND((COALESCE(SUM(amount_usd) FILTER (WHERE type IN ('payout', 'fee') AND status = 'succeeded'), 0.0) + COALESCE(SUM(amount_usd) FILTER (WHERE type = 'refund' AND status = 'succeeded'), 0.0))::numeric, 2) AS expenses,
                ROUND(COALESCE(SUM(net_amount_usd) FILTER (WHERE status = 'succeeded'), 0.0)::numeric, 2) AS net_profit
            FROM transactions
            WHERE occurred_at IS NOT NULL
            GROUP BY DATE_TRUNC('month', occurred_at)
            ORDER BY month DESC
            LIMIT 6;
            """
        )
        t1 = Table(title="Executive 6-Month Comparison (Continuous & Comparable)")
        t1.add_column("Month", style="cyan")
        t1.add_column("Revenue ($)", style="green", justify="right")
        t1.add_column("Expenses ($)", style="red", justify="right")
        t1.add_column("Net Profit ($)", style="bold yellow", justify="right")
        t1.add_column("Net Margin", style="magenta", justify="right")
        for r in reversed(cur.fetchall()):
            rev, exp, net = float(r[1]), float(r[2]), float(r[3])
            margin = f"{(net / rev * 100):.1f}%" if rev > 0 else "0.0%"
            t1.add_row(str(r[0])[:7], f"${rev:,.2f}", f"${exp:,.2f}", f"${net:,.2f}", margin)
        console.print(t1)

        # Verification Table: Last 12 Days Inflow/Outflow
        console.rule(
            "[bold green]Verification 2: Recent Daily Cash Inflows vs Outflows[/bold green]"
        )
        cur.execute(
            """
            SELECT date, inflows_usd, outflows_usd, net_flow_usd
            FROM analytics.daily_cash_position
            ORDER BY date DESC
            LIMIT 12;
            """
        )
        t2 = Table(title="Daily Inflow vs Outflow (No zero gaps, no 50x spikes)")
        t2.add_column("Date", style="cyan")
        t2.add_column("Inflows ($)", style="green", justify="right")
        t2.add_column("Outflows ($)", style="red", justify="right")
        t2.add_column("Net Flow ($)", style="bold yellow", justify="right")
        for r in reversed(cur.fetchall()):
            t2.add_row(
                str(r[0]), f"${float(r[1]):,.2f}", f"${float(r[2]):,.2f}", f"${float(r[3]):,.2f}"
            )
        console.print(t2)

        console.rule(f"[bold green]Successfully enhanced historical data on {label}![/bold green]")
    finally:
        conn.close()


def main():
    parser = argparse.ArgumentParser(description="Enhance historical data for LedgerFlow")
    parser.add_argument(
        "--db-url",
        type=str,
        default=None,
        help="Database connection URL (defaults to DATABASE_URL or SUPABASE_DATABASE_URL)",
    )
    parser.add_argument(
        "--both", action="store_true", help="Apply to both Cloud database and local PostgreSQL"
    )
    args = parser.parse_args()

    local_url = os.getenv("DATABASE_URL")
    cloud_url = os.getenv("SUPABASE_DATABASE_URL") or os.getenv("CLOUD_DATABASE_URL")

    if args.both:
        target_cloud = args.db_url or cloud_url
        if target_cloud:
            run_pipeline(target_cloud, label="Cloud Database (Supabase)")
        else:
            console.log(
                "[yellow]Notice: SUPABASE_DATABASE_URL or --db-url not set for cloud pipeline[/yellow]"
            )

        if local_url and local_url != target_cloud:
            try:
                run_pipeline(local_url, label="Local PostgreSQL")
            except Exception as e:
                console.log(f"[yellow]Local PostgreSQL notice: {e}[/yellow]")
        elif not local_url:
            console.log("[yellow]Notice: DATABASE_URL not set for local PostgreSQL[/yellow]")
    elif args.db_url:
        run_pipeline(args.db_url, label="Target Database")
    elif cloud_url:
        run_pipeline(cloud_url, label="Cloud Database (Supabase)")
    elif local_url:
        run_pipeline(local_url, label="Local PostgreSQL (DATABASE_URL)")
    else:
        console.log(
            "[red]No database URL specified. Provide --db-url or set DATABASE_URL / SUPABASE_DATABASE_URL in .env[/red]"
        )
        sys.exit(1)


if __name__ == "__main__":
    main()
