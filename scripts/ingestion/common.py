#!/usr/bin/env python3
"""
LedgerFlow: Shared Ingestion Logic
Common functions for both batch and real-time ingestion (PostgreSQL).
"""

from __future__ import annotations

import json
from datetime import UTC, datetime

import polars as pl
from rich.console import Console

from scripts.db.connection import copy_upsert_dataframe, get_conn

console = Console()

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
    PostgreSQL schema stores these as separate SMALLINT / DATE columns.
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

# Columns that are GENERATED ALWAYS ... STORED in PostgreSQL
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


def upsert_transactions(transactions: list[dict], db_url: str | None = None) -> int:
    """
    Upsert transactions into PostgreSQL using transaction_id conflict handling.
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
        if row.get("metadata_json") is not None and not isinstance(row["metadata_json"], str):
            row["metadata_json"] = json.dumps(row["metadata_json"])
        clean.append({col: row[col] for col in _INSERT_COLS})

    df = pl.DataFrame(
        clean,
        schema_overrides={
            "transaction_id": pl.String,
            "idempotency_key": pl.String,
            "occurred_at": pl.Datetime("us", "UTC"),
            "posted_at": pl.Datetime("us", "UTC"),
            "occurred_date": pl.Date,
            "posted_date": pl.Date,
            "occurred_hour": pl.Int16,
            "occurred_dow": pl.Int16,
            "occurred_week": pl.Int16,
            "occurred_month": pl.Int16,
            "occurred_quarter": pl.Int16,
            "occurred_year": pl.Int16,
            "type": pl.String,
            "status": pl.String,
            "source": pl.String,
            "amount": pl.Int64,
            "currency": pl.String,
            "fx_rate": pl.Float64,
            "net_amount": pl.Int64,
            "fee_amount": pl.Int64,
            "customer_id": pl.String,
            "merchant_account_id": pl.String,
            "product_line": pl.String,
            "department": pl.String,
            "account_code": pl.String,
            "cost_center": pl.String,
            "basis": pl.String,
            "decline_code": pl.String,
            "risk_level": pl.String,
            "dispute_id": pl.String,
            "dispute_status": pl.String,
            "is_recurring": pl.Boolean,
            "description": pl.String,
            "metadata_json": pl.String,
            "ingested_at": pl.Datetime("us", "UTC"),
            "batch_id": pl.String,
        },
        strict=False,
    )

    update_cols = [
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

    with get_conn(db_url) as conn:
        copy_upsert_dataframe(
            conn,
            "transactions",
            df,
            conflict_cols=["transaction_id"],
            update_cols=update_cols,
        )

        source = transactions[0].get("source", "unknown")
        count = conn.execute(
            "SELECT COUNT(*) FROM transactions WHERE source = %s", [source]
        ).fetchone()[0]

    return int(count or 0)


# =============================================================================
# STRIPE NORMALIZER
# =============================================================================


def normalize_stripe_event(event: dict, stripe_account_id: str) -> dict | None:
    """
    Normalize a Stripe event dict to unified transaction schema.
    Works for both batch (Event object) and webhook (raw dict).
    """
    evt_type = event.get("type")
    obj = event.get("data", {}).get("object", event)

    if evt_type not in TYPE_MAP:
        return None

    txn_type = TYPE_MAP[evt_type]
    txn_id = obj.get("id")
    if not txn_id:
        return None

    idempotency_key = f"stripe_{evt_type}_{txn_id}"

    created = obj.get("created", event.get("created"))
    occurred_at = datetime.fromtimestamp(created, tz=UTC) if created else datetime.now(UTC)

    amount = obj.get("amount", 0)
    currency = obj.get("currency", "usd").upper()
    status = STATUS_MAP.get(obj.get("status", "succeeded"), "succeeded")
    customer_id = obj.get("customer")

    decline_code = None
    if txn_type == "charge" and status == "failed":
        decline_code = obj.get("failure_code")

    risk_level = obj.get("outcome", {}).get("risk_level", "normal")
    dispute_id = obj.get("dispute")
    description = obj.get("description") or obj.get("statement_descriptor") or ""
    metadata = obj.get("metadata", {})

    fee_amount = 0
    if txn_type == "charge" and status == "succeeded":
        fee_amount = int(amount * 0.029 + 30)
    elif txn_type == "refund":
        fee_amount = -int(amount * 0.029)

    if txn_type in ("refund", "payout", "fee"):
        net_amount = -abs(amount)
    elif txn_type == "charge" and status == "succeeded":
        net_amount = amount - fee_amount
    else:
        net_amount = amount

    now = datetime.now(UTC)
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
        "metadata_json": json.dumps(metadata),
        "ingested_at": now,
        "batch_id": f"stripe_webhook_{now.strftime('%Y%m%d_%H%M%S')}",
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
    if txn.get("pending"):
        return None

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

    amount_cents = int(abs(txn.get("amount", 0) * 100))
    is_credit = txn.get("amount", 0) < 0
    net_amount = amount_cents if is_credit else -amount_cents

    occurred_at = datetime.combine(
        datetime.strptime(txn.get("date"), "%Y-%m-%d").date(),
        datetime.min.time(),
        tzinfo=UTC,
    )
    now = datetime.now(UTC)

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
        "net_amount": net_amount,
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
        "metadata_json": json.dumps({"plaid_category": plaid_category, "account_id": account_id}),
        "ingested_at": now,
        "batch_id": f"plaid_webhook_{now.strftime('%Y%m%d_%H%M%S')}",
    }
    base.update(_date_fields(occurred_at))
    return base
