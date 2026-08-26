#!/usr/bin/env python3
"""
LedgerFlow: Shared Ingestion Logic
Common functions for both batch and real-time ingestion.
"""

import threading
from datetime import datetime
from pathlib import Path

import duckdb
import polars as pl
from rich.console import Console

console = Console()

# =============================================================================
# SINGLETON DB CONNECTION MANAGER
# Solves DuckDB's single-writer exclusive lock when multiple threads/coroutines
# try to open the same file simultaneously.
# =============================================================================

_db_lock = threading.Lock()
_conn: dict[str, duckdb.DuckDBPyConnection] = {}


def get_conn(db_path: Path) -> duckdb.DuckDBPyConnection:
    """Return (and cache) a single shared DuckDB connection for db_path."""
    key = str(db_path.resolve())
    if key not in _conn or not _conn[key]:
        _conn[key] = duckdb.connect(str(db_path))
    return _conn[key]


# =============================================================================
# TYPE/STATUS MAPPINGS (shared with ingest_stripe.py)
# =============================================================================

TYPE_MAP = {
    "charge.succeeded": "charge",
    "charge.failed": "charge",
    "charge.refunded": "refund",
    "refund.created": "refund",
    "payout.created": "payout",
    "payout.paid": "payout",
    "payout.failed": "payout",
    "invoice.payment_succeeded": "invoice_payment",
    "invoice.payment_failed": "invoice_payment",
    "transfer.created": "transfer",
}

STATUS_MAP = {
    "succeeded": "succeeded",
    "failed": "failed",
    "pending": "pending",
    "canceled": "canceled",
}

# =============================================================================
# DERIVED DATE/TIME HELPER
# =============================================================================


def _date_fields(dt: datetime) -> dict:
    """
    Compute all derived date/time columns from a datetime.
    DuckDB schema stores these as separate SMALLINT / DATE columns
    so they must be set explicitly on every INSERT — they are NOT
    generated columns and there is no trigger to backfill them.
    """
    # Python's weekday(): Mon=0 … Sun=6  →  we want Sun=0 … Sat=6
    dow = (dt.weekday() + 1) % 7  # Sun=0
    week = dt.isocalendar()[1]
    quarter = (dt.month - 1) // 3 + 1
    return {
        "occurred_date": dt.date(),
        "posted_date": dt.date(),
        "occurred_hour": dt.hour,
        "occurred_dow": dow,
        "occurred_week": week,
        "occurred_month": dt.month,
        "occurred_quarter": quarter,
        "occurred_year": dt.year,
    }


# =============================================================================
# CORE WRITE FUNCTION
# =============================================================================

# Columns that are GENERATED ALWAYS in DuckDB — must never be in INSERT list
_GENERATED_COLS = {"amount_usd", "net_amount_usd", "fee_amount_usd"}

# Generated columns in DuckDB — computed automatically from amount * fx_rate / 100.0
_GENERATED_COLS = {"amount_usd", "net_amount_usd", "fee_amount_usd"}

# Explicit ordered list of insertable columns (matches schema in init_db.py)
_INSERT_COLS = [
    "transaction_id",
    "idempotency_key",
    "occurred_at",
    "posted_at",
    "occurred_date",
    "posted_date",
    "occurred_hour",
    "occurred_dow",
    "occurred_week",
    "occurred_month",
    "occurred_quarter",
    "occurred_year",
    "type",
    "status",
    "source",
    "amount",
    "currency",
    "fx_rate",
    "net_amount",
    "fee_amount",
    "customer_id",
    "merchant_account_id",
    "product_line",
    "department",
    "account_code",
    "cost_center",
    "basis",
    "decline_code",
    "risk_level",
    "dispute_id",
    "dispute_status",
    "is_recurring",
    "description",
    "metadata_json",
    "ingested_at",
    "batch_id",
]


def upsert_transactions(transactions: list[dict], db_path: Path) -> int:
    """
    Upsert transactions into DuckDB using idempotency_key for deduplication.
    Returns total count of transactions from this source after write.
    """
    if not transactions:
        return 0

    clean = []
    for t in transactions:
        row = {k: v for k, v in t.items() if k not in _GENERATED_COLS}
        for col in _INSERT_COLS:
            row.setdefault(col, None)
        if row.get("is_recurring") is None:
            row["is_recurring"] = False
        clean.append(row)

    df = pl.DataFrame(
        clean,
        schema_overrides={
            "occurred_date": pl.Date,
            "posted_date": pl.Date,
            "occurred_hour": pl.Int16,
            "occurred_dow": pl.Int16,
            "occurred_week": pl.Int16,
            "occurred_month": pl.Int16,
            "occurred_quarter": pl.Int16,
            "occurred_year": pl.Int16,
            "amount": pl.Int64,
            "net_amount": pl.Int64,
            "fee_amount": pl.Int64,
            "fx_rate": pl.Float64,
            "is_recurring": pl.Boolean,
        },
    )

    col_list = ", ".join(_INSERT_COLS)
    update_set = ", ".join(
        f"{c} = EXCLUDED.{c}"
        for c in [
            "status",
            "posted_at",
            "posted_date",
            "net_amount",
            "fee_amount",
            "dispute_id",
            "dispute_status",
            "ingested_at",
            "batch_id",
        ]
    )

    with _db_lock:
        conn = get_conn(db_path)

        # DuckDB v1.5: ON CONFLICT upserts need an explicit UNIQUE INDEX.
        conn.execute("""
            CREATE UNIQUE INDEX IF NOT EXISTS ux_transactions_id
            ON transactions(transaction_id)
        """)

        conn.register("staging_txns", df)
        conn.execute(f"""
            INSERT INTO transactions ({col_list})
            SELECT {col_list} FROM staging_txns
            ON CONFLICT (transaction_id) DO UPDATE SET
                {update_set}
        """)

        # Get source from first transaction to count
        source = transactions[0].get("source", "unknown")
        count = conn.execute(
            "SELECT COUNT(*) FROM transactions WHERE source = ?", [source]
        ).fetchone()[0]

    return count


# =============================================================================
# STRIPE NORMALIZER
# =============================================================================


def normalize_stripe_event(event: dict, stripe_account_id: str) -> dict | None:
    """
    Normalize a Stripe event dict to unified transaction schema.
    Works for both batch (Event object) and webhook (raw dict).
    """
    evt_type = event.get("type")
    obj = event.get("data", {}).get("object", event)  # Handle both formats

    if evt_type not in TYPE_MAP:
        return None

    txn_type = TYPE_MAP[evt_type]
    txn_id = obj.get("id")
    if not txn_id:
        return None

    # Idempotency key for deduplication
    idempotency_key = f"stripe_{evt_type}_{txn_id}"

    # Timestamp
    created = obj.get("created", event.get("created"))
    occurred_at = datetime.fromtimestamp(created) if created else datetime.utcnow()

    # Amount & currency
    amount = obj.get("amount", 0)
    currency = obj.get("currency", "usd").upper()

    # Status
    status = STATUS_MAP.get(obj.get("status", "succeeded"), "succeeded")

    # Customer
    customer_id = obj.get("customer")

    # Decline code
    decline_code = None
    if txn_type == "charge" and status == "failed":
        decline_code = obj.get("failure_code")

    # Card details
    risk_level = obj.get("outcome", {}).get("risk_level", "normal")

    # Dispute
    dispute_id = obj.get("dispute")

    # Description
    description = obj.get("description") or obj.get("statement_descriptor") or ""

    # Metadata
    metadata = obj.get("metadata", {})

    # Net amount & fees (Stripe standard: 2.9% + 30¢)
    fee_amount = 0
    if txn_type == "charge" and status == "succeeded":
        fee_amount = int(amount * 0.029 + 30)
    elif txn_type == "refund":
        fee_amount = -int(amount * 0.029)

    net_amount = amount - fee_amount if txn_type == "charge" else amount

    base = {
        "transaction_id": txn_id,
        "idempotency_key": idempotency_key,
        "occurred_at": occurred_at,
        "posted_at": occurred_at,
        "type": txn_type,
        "status": status,
        "source": "stripe",
        "amount": amount,
        "currency": currency,
        "fx_rate": 1.0,
        "net_amount": net_amount,
        "fee_amount": fee_amount,
        "customer_id": customer_id,
        "merchant_account_id": stripe_account_id,
        "product_line": metadata.get("product_line", "subscriptions"),
        "department": metadata.get("department", "engineering"),
        "account_code": metadata.get("account_code", "4000-revenue"),
        "cost_center": metadata.get("cost_center", "CC-ENG-001"),
        "basis": "cash",
        "decline_code": decline_code,
        "risk_level": risk_level,
        "dispute_id": dispute_id,
        "dispute_status": None,
        "is_recurring": False,
        "description": description,
        "metadata_json": str(metadata).replace("'", '"'),
        "ingested_at": datetime.utcnow(),
        "batch_id": f"stripe_webhook_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
    }
    base.update(_date_fields(occurred_at))
    return base


# =============================================================================
# PLAID NORMALIZER
# =============================================================================


def normalize_plaid_transaction(txn: dict, account_id: str) -> dict | None:
    """
    Normalize a Plaid transaction dict to unified schema.
    """
    # Skip pending
    if txn.get("pending"):
        return None

    # Plaid category mapping (simplified from ingest_plaid.py)
    PLAID_TO_INTERNAL = {
        "INCOME_WAGES": ("invoice_payment", "professional_services"),
        "INCOME_DIVIDENDS": ("charge", "investments"),
        "INCOME_INTEREST": ("charge", "investments"),
        "PAYMENT_CREDIT_CARD": ("transfer", "financing"),
        "LOAN_PAYMENT": ("transfer", "financing"),
        "RENT": ("charge", "operations"),
        "UTILITIES": ("charge", "operations"),
        "INSURANCE": ("charge", "operations"),
        "TAXES": ("charge", "g&a"),
        "TRAVEL": ("charge", "sales"),
        "MEALS": ("charge", "sales"),
        "OFFICE_SUPPLIES": ("charge", "g&a"),
        "SOFTWARE_SUBSCRIPTIONS": ("charge", "engineering"),
        "PROFESSIONAL_SERVICES": ("charge", "professional_services"),
        "ADVERTISING": ("charge", "marketing"),
        "PAYROLL": ("charge", "operations"),
        "BANK_FEES": ("fee", "g&a"),
    }

    plaid_category = (txn.get("category") or ["UNCATEGORIZED"])[0]
    txn_type, product_line = PLAID_TO_INTERNAL.get(plaid_category, ("charge", "operations"))

    # Amount: Plaid positive = debit (outflow), negative = credit (inflow)
    amount_cents = int(abs(txn.get("amount", 0) * 100))
    is_credit = txn.get("amount", 0) < 0

    occurred_at = datetime.combine(
        datetime.strptime(txn.get("date"), "%Y-%m-%d").date(),
        datetime.min.time(),
    )

    base = {
        "transaction_id": f"plaid_{txn.get('transaction_id')}",
        "idempotency_key": f"plaid_{txn.get('transaction_id')}",
        "occurred_at": occurred_at,
        "posted_at": occurred_at,
        "type": txn_type,
        "status": "succeeded",
        "source": "plaid",
        "amount": amount_cents,
        "currency": txn.get("iso_currency_code") or "USD",
        "fx_rate": 1.0,
        "net_amount": amount_cents,
        "fee_amount": 0,
        "customer_id": None,
        "merchant_account_id": account_id,
        "product_line": product_line,
        "department": product_line,
        "account_code": "4000-revenue" if is_credit else "6000-expense",
        "cost_center": "CC-OPS-001",
        "basis": "cash",
        "decline_code": None,
        "risk_level": "normal",
        "dispute_id": None,
        "dispute_status": None,
        "is_recurring": False,
        "description": txn.get("name") or txn.get("merchant_name") or "Bank transaction",
        "metadata_json": f'{{"plaid_category": "{plaid_category}", "account_id": "{account_id}"}}',
        "ingested_at": datetime.utcnow(),
        "batch_id": f"plaid_webhook_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
    }
    base.update(_date_fields(occurred_at))
    return base
