#!/usr/bin/env python3
"""
LedgerFlow: Synthetic Transaction Data Generator

Generates realistic financial transaction data for development and testing.
Produces 50k+ rows covering charges, refunds, payouts, fees, disputes, and more.

Usage:
    python scripts/generate_synthetic.py --rows 50000 --output data/ledgerflow.duckdb
"""

import argparse
import random
import sys
from datetime import datetime, timedelta
from pathlib import Path

import duckdb
import numpy as np
import polars as pl
from faker import Faker
from rich.console import Console

# Ensure project root is in sys.path
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

fake = Faker()
console = Console()

# =============================================================================
# CONFIGURATION
# =============================================================================

SOURCES = ["stripe", "adyen", "ach", "wire", "plaid", "manual_journal"]
TYPES = ["charge", "refund", "payout", "fee", "transfer", "invoice_payment", "adjustment"]
STATUSES = ["succeeded", "failed", "pending", "disputed", "canceled"]
CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY"]
DECLINE_CODES = [
    "insufficient_funds",
    "card_declined",
    "expired_card",
    "incorrect_cvc",
    "processing_error",
    "call_issuer",
    "pickup_card",
    "restricted_card",
    "lost_card",
    "stolen_card",
    "suspected_fraud",
    "velocity_exceeded",
    "do_not_honor",
    "generic_decline",
    "authentication_required",
]
CARD_BRANDS = ["Visa", "Mastercard", "American Express", "Discover", "JCB"]
CARD_FUNDING = ["credit", "debit", "prepaid"]
PRODUCT_LINES = [
    "subscriptions",
    "professional_services",
    "marketplace",
    "ecommerce",
    "platform_fees",
]
DEPARTMENTS = ["engineering", "sales", "marketing", "g&a", "operations", "support"]
ACCOUNT_CODES = {
    "subscriptions": "4000-revenue",
    "professional_services": "4100-revenue",
    "marketplace": "4200-revenue",
    "ecommerce": "4300-revenue",
    "platform_fees": "4400-revenue",
    "refund": "4900-contra_revenue",
    "fee": "6000-payment_processing",
    "payout": "1010-checking",
}
RISK_LEVELS = ["normal", "elevated", "highest"]
DISPUTE_STATUSES = ["warning_needs_response", "warning_under_review", "won", "lost"]
BASIS_TYPES = ["cash", "accrual"]

# Customer pool
N_CUSTOMERS = 2000
N_MERCHANT_ACCOUNTS = 5

# =============================================================================
# HELPERS
# =============================================================================


def random_date(start: datetime, end: datetime) -> datetime:
    """Random datetime between start and end."""
    return start + timedelta(seconds=random.randint(0, int((end - start).total_seconds())))


def weighted_choice(choices: dict) -> str:
    """Choose from dict of {item: weight}."""
    items, weights = zip(*choices.items(), strict=False)
    return random.choices(items, weights=weights, k=1)[0]


def generate_customers(n: int) -> pl.DataFrame:
    """Generate customer dimension table."""
    return pl.DataFrame(
        {
            "customer_id": [f"cus_{i:06d}" for i in range(1, n + 1)],
            "customer_email": [fake.email() for _ in range(n)],
            "customer_name": [fake.company() for _ in range(n)],
            "created_at": [
                fake.date_time_between(start_date="-2y", end_date="-30d") for _ in range(n)
            ],
            "country": [fake.country_code() for _ in range(n)],
            "plan": np.random.choice(
                ["free", "starter", "pro", "enterprise"], n, p=[0.4, 0.3, 0.2, 0.1]
            ),
        }
    )


def generate_merchant_accounts(n: int) -> pl.DataFrame:
    """Generate merchant account dimension."""
    return pl.DataFrame(
        {
            "merchant_account_id": [f"acct_{i:03d}" for i in range(1, n + 1)],
            "account_name": [f"{fake.company()} Account" for _ in range(n)],
            "currency": np.random.choice(CURRENCIES, n, p=[0.6, 0.15, 0.1, 0.05, 0.05, 0.05]),
            "country": [fake.country_code() for _ in range(n)],
        }
    )


# =============================================================================
# MAIN GENERATION
# =============================================================================


def generate_transactions(
    n_rows: int,
    start_date: datetime,
    end_date: datetime,
    customers: pl.DataFrame,
    merchants: pl.DataFrame,
) -> pl.DataFrame:
    """Generate the main transaction fact table."""

    console.log(f"Generating {n_rows:,} transactions from {start_date.date()} to {end_date.date()}")

    # Pre-generate arrays for speed
    transaction_ids = [f"txn_{i:08d}" for i in range(1, n_rows + 1)]
    idempotency_keys = [f"idem_{fake.uuid4()}" for _ in range(n_rows)]
    occurred_ats = [random_date(start_date, end_date) for _ in range(n_rows)]
    # Posted date is 0-2 days after occurred
    posted_ats = [
        oa + timedelta(days=random.randint(0, 2), hours=random.randint(0, 23))
        for oa in occurred_ats
    ]

    # Type distribution: mostly charges, some refunds, fees, payouts
    type_weights = {
        "charge": 0.65,
        "refund": 0.08,
        "payout": 0.05,
        "fee": 0.12,
        "transfer": 0.03,
        "invoice_payment": 0.05,
        "adjustment": 0.02,
    }
    types = np.random.choice(list(type_weights.keys()), n_rows, p=list(type_weights.values()))

    # Status depends on type
    statuses = []
    for t in types:
        if t in ("payout", "transfer") or t == "fee":
            statuses.append("succeeded")
        elif t == "refund":
            statuses.append(np.random.choice(["succeeded", "failed"], p=[0.97, 0.03]))
        else:  # charge, invoice_payment
            statuses.append(
                np.random.choice(
                    ["succeeded", "failed", "pending", "disputed"], p=[0.92, 0.05, 0.02, 0.01]
                )
            )

    sources = np.random.choice(SOURCES, n_rows, p=[0.5, 0.1, 0.1, 0.05, 0.15, 0.1])

    # Amounts: log-normal distribution for charges
    amounts = []
    currencies = []
    fx_rates = []
    for i in range(n_rows):
        cur = np.random.choice(CURRENCIES, p=[0.65, 0.15, 0.1, 0.03, 0.03, 0.04])
        currencies.append(cur)
        fx_rates.append(
            {"USD": 1.0, "EUR": 0.92, "GBP": 0.79, "CAD": 0.73, "AUD": 0.65, "JPY": 0.0067}[cur]
        )

        t = types[i]
        if t == "charge":
            # Log-normal: median ~$50, long tail to $5000+
            amt_cents = int(np.random.lognormal(mean=10.5, sigma=1.2))
            amt_cents = min(max(amt_cents, 50), 500000)  # $0.50 to $5000
        elif t == "refund":
            amt_cents = int(np.random.lognormal(mean=9.5, sigma=1.0))
            amt_cents = min(max(amt_cents, 50), 100000)
        elif t == "payout":
            amt_cents = int(np.random.lognormal(mean=12, sigma=1.5))
            amt_cents = min(max(amt_cents, 1000), 2000000)
        elif t == "fee":
            amt_cents = int(np.random.uniform(30, 5000))
        else:
            amt_cents = int(np.random.lognormal(mean=10, sigma=1.0))
            amt_cents = min(max(amt_cents, 100), 100000)
        amounts.append(amt_cents)

    # Net amount = amount - fee (for charges)
    net_amounts = []
    fee_amounts = []
    for i in range(n_rows):
        t = types[i]
        amt = amounts[i]
        if t == "charge" and statuses[i] == "succeeded":
            # Fee: 2.9% + 30c for Stripe-like
            fee = int(amt * 0.029 + 30)
            fee = min(fee, amt)  # Can't exceed amount
        elif t == "fee":
            fee = 0
        else:
            fee = 0
        fee_amounts.append(fee)
        net_amounts.append(amt - fee if t == "charge" else amt)

    # Entities
    customer_ids = np.random.choice(customers["customer_id"].to_list(), n_rows)
    merchant_account_ids = np.random.choice(merchants["merchant_account_id"].to_list(), n_rows)

    # Attribution
    product_lines = np.random.choice(PRODUCT_LINES, n_rows, p=[0.4, 0.15, 0.15, 0.15, 0.15])
    departments = np.random.choice(DEPARTMENTS, n_rows, p=[0.25, 0.2, 0.15, 0.15, 0.15, 0.1])
    account_codes = [ACCOUNT_CODES.get(pl, "9999-unknown") for pl in product_lines]
    cost_centers = [f"CC-{fake.bothify('??-###')}" for _ in range(n_rows)]

    # Basis
    basis = np.random.choice(BASIS_TYPES, n_rows, p=[0.7, 0.3])

    # Risk & decline
    decline_codes = []
    risk_levels = []
    dispute_ids = []
    dispute_statuses = []
    for i in range(n_rows):
        if statuses[i] == "failed" and types[i] in ("charge", "invoice_payment"):
            decline_codes.append(np.random.choice(DECLINE_CODES))
            risk_levels.append(np.random.choice(RISK_LEVELS, p=[0.6, 0.3, 0.1]))
        else:
            decline_codes.append(None)
            risk_levels.append("normal")

        if statuses[i] == "disputed":
            dispute_ids.append(f"dp_{fake.uuid4()[:12]}")
            dispute_statuses.append(np.random.choice(DISPUTE_STATUSES))
        else:
            dispute_ids.append(None)
            dispute_statuses.append(None)

    # Descriptions
    descriptions = []
    for i in range(n_rows):
        t = types[i]
        if t == "charge":
            descriptions.append(f"{product_lines[i].replace('_', ' ').title()} - {fake.bs()}")
        elif t == "refund":
            descriptions.append(f"Refund for {product_lines[i].replace('_', ' ')}")
        elif t == "payout":
            descriptions.append(f"Payout to bank account ending in {fake.bothify('####')}")
        elif t == "fee":
            descriptions.append(f"Payment processing fee - {product_lines[i]}")
        else:
            descriptions.append(fake.sentence())

    # Metadata JSON
    card_brands = np.random.choice(CARD_BRANDS, n_rows)
    card_fundings = np.random.choice(["credit", "debit", "prepaid"], n_rows, p=[0.7, 0.25, 0.05])
    metadata_json = [
        f'{{"source_internal_id": "{fake.uuid4()}", "card_brand": "{card_brands[i]}", "card_funding": "{card_fundings[i]}"}}'
        for i in range(n_rows)
    ]

    # Ingestion metadata
    ingested_at = [datetime.utcnow() for _ in range(n_rows)]
    batch_ids = [f"batch_{fake.uuid4()[:8]}" for _ in range(n_rows)]

    # Build DataFrame
    df = pl.DataFrame(
        {
            "transaction_id": transaction_ids,
            "idempotency_key": idempotency_keys,
            "occurred_at": occurred_ats,
            "posted_at": posted_ats,
            "type": types,
            "status": statuses,
            "source": sources,
            "amount": amounts,
            "currency": currencies,
            "fx_rate": fx_rates,
            "net_amount": net_amounts,
            "fee_amount": fee_amounts,
            "customer_id": customer_ids,
            "merchant_account_id": merchant_account_ids,
            "product_line": product_lines,
            "department": departments,
            "account_code": account_codes,
            "cost_center": cost_centers,
            "basis": basis,
            "decline_code": decline_codes,
            "risk_level": risk_levels,
            "dispute_id": dispute_ids,
            "dispute_status": dispute_statuses,
            "description": descriptions,
            "metadata_json": metadata_json,
            "ingested_at": ingested_at,
            "batch_id": batch_ids,
        }
    )

    # Add derived columns
    df = df.with_columns(
        [
            pl.col("occurred_at").dt.date().alias("occurred_date"),
            pl.col("posted_at").dt.date().alias("posted_date"),
            pl.col("occurred_at").dt.hour().alias("occurred_hour"),
            pl.col("occurred_at").dt.weekday().alias("occurred_dow"),
            pl.col("occurred_at").dt.week().alias("occurred_week"),
            pl.col("occurred_at").dt.month().alias("occurred_month"),
            pl.col("occurred_at").dt.quarter().alias("occurred_quarter"),
            pl.col("occurred_at").dt.year().alias("occurred_year"),
            (pl.col("amount") * pl.col("fx_rate") / 100.0).alias("amount_usd"),
            (pl.col("net_amount") * pl.col("fx_rate") / 100.0).alias("net_amount_usd"),
            (pl.col("fee_amount") * pl.col("fx_rate") / 100.0).alias("fee_amount_usd"),
            # Recurring detection heuristic
            pl.when(
                (pl.col("type") == "charge")
                & (pl.col("status") == "succeeded")
                & (pl.col("product_line").is_in(["subscriptions"]))
                & (pl.col("description").str.contains("(?i)recur|subscription|monthly"))
            )
            .then(True)
            .otherwise(False)
            .alias("is_recurring"),
        ]
    )

    return df


def write_to_duckdb(df: pl.DataFrame, db_path: Path) -> None:
    """
    Write generated transactions DataFrame to DuckDB and also save partitioned Parquet files.
    Ensures all views, indexes, and full schema are present.
    """
    db_path.parent.mkdir(parents=True, exist_ok=True)

    # Write partitioned by month
    parquet_dir = db_path.parent / "transactions"
    df.write_parquet(
        parquet_dir,
        partition_by=["occurred_year", "occurred_month"],
        compression="zstd",
    )

    from scripts.db.init_db import SCHEMA_SQL
    from scripts.ingestion.common import _INSERT_COLS

    conn = duckdb.connect(str(db_path))

    # Initialize full schema (tables, views, indexes, generated columns)
    conn.execute(SCHEMA_SQL)

    # Insert into transactions using non-generated columns directly from DataFrame
    col_str = ", ".join(_INSERT_COLS)
    conn.register("df_staging", df)
    conn.execute(f"""
        INSERT OR IGNORE INTO transactions ({col_str})
        SELECT {col_str} FROM df_staging
        ORDER BY occurred_at;
    """)

    # Verify
    count = conn.execute("SELECT COUNT(*) FROM transactions").fetchone()[0]
    console.log(f"[green][OK][/green] Written {count:,} transactions to {db_path}")

    conn.close()


def main():
    parser = argparse.ArgumentParser(description="Generate synthetic LedgerFlow data")
    parser.add_argument(
        "--rows", type=int, default=50000, help="Number of transactions to generate"
    )
    parser.add_argument("--days", type=int, default=365, help="Days of history to generate")
    parser.add_argument(
        "--output", type=Path, default=Path("data/ledgerflow.duckdb"), help="Output DuckDB path"
    )
    parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducibility")
    args = parser.parse_args()

    random.seed(args.seed)
    np.random.seed(args.seed)
    Faker.seed(args.seed)

    end_date = datetime.utcnow().replace(hour=23, minute=59, second=59, microsecond=0)
    start_date = end_date - timedelta(days=args.days)

    console.rule("[bold blue]LedgerFlow Synthetic Data Generator[/bold blue]")

    # Generate dimensions
    console.log("Generating customer dimension...")
    customers = generate_customers(N_CUSTOMERS)

    console.log("Generating merchant accounts...")
    merchants = generate_merchant_accounts(N_MERCHANT_ACCOUNTS)

    # Generate facts
    transactions = generate_transactions(args.rows, start_date, end_date, customers, merchants)

    # Write to DuckDB
    write_to_duckdb(transactions, args.output)

    # Also write dimension tables
    conn = duckdb.connect(str(args.output))
    conn.register("customers_df", customers)
    conn.execute("CREATE OR REPLACE TABLE customers AS SELECT * FROM customers_df")
    conn.register("merchants_df", merchants)
    conn.execute("CREATE OR REPLACE TABLE merchants AS SELECT * FROM merchants_df")
    conn.close()

    console.rule("[bold green]Done![/bold green]")
    console.log(f"Database: {args.output}")
    console.log(f"Transactions: {len(transactions):,}")
    console.log(f"Customers: {len(customers):,}")
    console.log(f"Merchants: {len(merchants):,}")


if __name__ == "__main__":
    main()
