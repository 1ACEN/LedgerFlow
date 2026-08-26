#!/usr/bin/env python3
"""
LedgerFlow: Real-time Webhook Receiver + Live Data Input API
FastAPI service to:
  - Receive Stripe and Plaid webhooks and ingest in real-time
  - Accept manual transaction entries via POST /transactions/manual
  - Serve a live data input dashboard at GET /
  - Stream synthetic demo transactions when DEMO_MODE=true

Usage:
    uv run uvicorn scripts.api.webhooks:app --port 8080 --reload
    # or:
    uv run python scripts/api/webhooks.py --port 8080
"""

import hashlib
import hmac
import json
import os
import random
import threading
import uuid
from datetime import datetime
from pathlib import Path

import stripe
from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field
from rich.console import Console

from scripts.ingestion.common import (
    _date_fields,
    _db_lock,
    get_conn,
    normalize_plaid_transaction,
    normalize_stripe_event,
    upsert_transactions,
)

load_dotenv()
console = Console()

# =============================================================================
# APP SETUP
# =============================================================================

app = FastAPI(
    title="LedgerFlow Live API",
    version="1.0.0",
    description="Real-time financial data ingestion and live input for LedgerFlow",
)

# Allow the live input UI (served at port 8080) to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============================================================================
# CONFIGURATION
# =============================================================================

DUCKDB_PATH = Path(os.getenv("DUCKDB_PATH", "data/ledgerflow.duckdb"))
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")
STRIPE_ACCOUNT_ID = os.getenv("STRIPE_ACCOUNT_ID", "acct_default")
PLAID_WEBHOOK_SECRET = os.getenv("PLAID_WEBHOOK_SECRET")
DEMO_MODE = os.getenv("DEMO_MODE", "true").lower() == "true"
DEMO_INTERVAL_SEC = float(os.getenv("DEMO_INTERVAL_SEC", "4"))

# Event set once the DB schema is confirmed ready
_db_ready = threading.Event()

# =============================================================================
# MODELS
# =============================================================================


class PlaidWebhook(BaseModel):
    webhook_type: str
    webhook_code: str
    item_id: str
    initial_update_complete: bool | None = None
    historical_update_complete: bool | None = None
    transactions_removed: list | None = None
    new_transactions: int | None = None


class ManualTransaction(BaseModel):
    """Schema for manual / live transaction entry."""

    amount_usd: float = Field(..., gt=0, description="Transaction amount in USD (e.g. 149.99)")
    type: str = Field(
        default="charge",
        description="charge | refund | payout | fee | transfer | invoice_payment",
    )
    status: str = Field(default="succeeded", description="succeeded | failed | pending | canceled")
    source: str = Field(default="manual", description="stripe | plaid | ach | wire | manual")
    currency: str = Field(default="USD", max_length=3)
    description: str | None = None
    product_line: str | None = Field(default="subscriptions")
    department: str | None = Field(default="engineering")
    account_code: str | None = Field(default="4000-revenue")
    cost_center: str | None = Field(default="CC-ENG-001")
    customer_id: str | None = None
    decline_code: str | None = None
    basis: str = Field(default="cash")
    is_recurring: bool = False


# =============================================================================
# STARTUP — seed DB if empty and DEMO_MODE enabled
# =============================================================================


@app.on_event("startup")
async def startup_event():
    """On startup: ensure DB exists and optionally seed with synthetic data."""
    DUCKDB_PATH.parent.mkdir(parents=True, exist_ok=True)

    # Initialize schema if DB is brand new
    try:
        with _db_lock:
            conn = get_conn(DUCKDB_PATH)
            tables = conn.execute(
                "SELECT table_name FROM information_schema.tables WHERE table_schema = 'main'"
            ).fetchall()
            existing = {r[0] for r in tables}

            if "transactions" not in existing:
                console.log("[yellow]DB is new — running schema init...[/yellow]")
                from scripts.db.init_db import SCHEMA_SQL

                conn.execute(SCHEMA_SQL)
                console.log("[green]Schema initialized.[/green]")
    except Exception as e:
        console.log(f"[red]Startup DB check failed: {e}[/red]")

    # Signal that the DB schema is ready before starting demo thread
    _db_ready.set()

    # Kick off demo stream in background thread
    if DEMO_MODE:
        console.log(
            f"[cyan]DEMO MODE ON — synthetic transactions every {DEMO_INTERVAL_SEC}s[/cyan]"
        )
        t = threading.Thread(target=_demo_stream_loop, daemon=True)
        t.start()


# =============================================================================
# DEMO STREAM
# =============================================================================

_DEMO_TYPES = ["charge", "charge", "charge", "refund", "payout", "invoice_payment", "charge"]
_DEMO_STATUSES_WEIGHTED = {
    "succeeded": 80,
    "failed": 12,
    "pending": 5,
    "canceled": 3,
}
_DEMO_SOURCES = ["stripe", "stripe", "stripe", "plaid", "ach"]
_DEMO_PRODUCTS = [
    "subscriptions",
    "professional_services",
    "marketplace",
    "ecommerce",
    "platform_fees",
]
_DEMO_DECLINES = [
    "insufficient_funds",
    "card_declined",
    "expired_card",
    "incorrect_cvc",
    "processing_error",
    "do_not_honor",
]


def _weighted_choice(d: dict) -> str:
    items = list(d.keys())
    weights = list(d.values())
    return random.choices(items, weights=weights, k=1)[0]


def _build_demo_transaction() -> dict:
    """Generate one realistic synthetic transaction."""
    txn_type = random.choice(_DEMO_TYPES)
    status = _weighted_choice(_DEMO_STATUSES_WEIGHTED)
    source = random.choice(_DEMO_SOURCES)
    product_line = random.choice(_DEMO_PRODUCTS)
    amount_cents = random.randint(500, 250_000)  # $5 – $2500
    now = datetime.now()

    fee_amount = 0
    if txn_type == "charge" and status == "succeeded":
        fee_amount = int(amount_cents * 0.029 + 30)
    elif txn_type == "refund":
        fee_amount = -int(amount_cents * 0.029)
    net_amount = amount_cents - fee_amount if txn_type == "charge" else amount_cents

    decline_code = None
    if status == "failed" and txn_type == "charge":
        decline_code = random.choice(_DEMO_DECLINES)

    account_code_map = {
        "subscriptions": "4000-revenue",
        "professional_services": "4100-revenue",
        "marketplace": "4200-revenue",
        "ecommerce": "4300-revenue",
        "platform_fees": "4400-revenue",
    }

    row = {
        "transaction_id": f"demo_{uuid.uuid4().hex[:16]}",
        "idempotency_key": f"demo_{uuid.uuid4().hex}",
        "occurred_at": now,
        "posted_at": now,
        "type": txn_type,
        "status": status,
        "source": source,
        "amount": amount_cents,
        "currency": "USD",
        "fx_rate": 1.0,
        "net_amount": net_amount,
        "fee_amount": fee_amount,
        "amount_usd": amount_cents / 100.0,
        "net_amount_usd": net_amount / 100.0,
        "fee_amount_usd": fee_amount / 100.0,
        "customer_id": f"cus_{uuid.uuid4().hex[:10]}",
        "merchant_account_id": STRIPE_ACCOUNT_ID,
        "product_line": product_line,
        "department": "engineering",
        "account_code": account_code_map.get(product_line, "4000-revenue"),
        "cost_center": "CC-ENG-001",
        "basis": random.choice(["cash", "accrual"]),
        "decline_code": decline_code,
        "risk_level": random.choice(["normal", "normal", "normal", "elevated", "highest"]),
        "dispute_id": None,
        "dispute_status": None,
        "is_recurring": random.random() < 0.3,
        "description": f"Demo {txn_type} — {product_line}",
        "metadata_json": f'{{"demo": true, "product_line": "{product_line}"}}',
        "ingested_at": now,
        "batch_id": f"demo_{now.strftime('%Y%m%d_%H%M%S')}",
    }
    row.update(_date_fields(now))
    return row


def _demo_stream_loop():
    """Background thread: insert one synthetic transaction every DEMO_INTERVAL_SEC seconds."""
    import time

    # Wait for DB schema to be ready before first insert
    _db_ready.wait(timeout=30)
    while True:
        try:
            txn = _build_demo_transaction()
            upsert_transactions([txn], DUCKDB_PATH)
        except Exception as e:
            console.log(f"[red]Demo stream error: {e}[/red]")
        time.sleep(DEMO_INTERVAL_SEC)


# =============================================================================
# SERVE LIVE INPUT UI
# =============================================================================

_UI_PATH = Path(__file__).parent / "live_input.html"


@app.get("/", response_class=HTMLResponse, include_in_schema=False)
async def root():
    """Serve the live data input dashboard."""
    if _UI_PATH.exists():
        return HTMLResponse(content=_UI_PATH.read_text(encoding="utf-8"))
    return HTMLResponse(
        content="<p>Live input UI not found. Check <code>scripts/api/live_input.html</code>.</p>"
    )


# =============================================================================
# LIVE DATA ENDPOINTS
# =============================================================================


@app.post("/transactions/manual", status_code=201)
async def create_manual_transaction(body: ManualTransaction):
    """
    Insert a single transaction directly — no Stripe/Plaid needed.
    Used by the live input UI and for testing.
    """
    amount_cents = int(round(body.amount_usd * 100))
    now = datetime.now()

    fee_amount = 0
    if body.type == "charge" and body.status == "succeeded":
        fee_amount = int(amount_cents * 0.029 + 30)
    elif body.type == "refund":
        fee_amount = -int(amount_cents * 0.029)
    net_amount = amount_cents - fee_amount if body.type == "charge" else amount_cents

    txn_id = f"manual_{uuid.uuid4().hex[:16]}"
    row = {
        "transaction_id": txn_id,
        "idempotency_key": f"manual_{uuid.uuid4().hex}",
        "occurred_at": now,
        "posted_at": now,
        "type": body.type,
        "status": body.status,
        "source": body.source,
        "amount": amount_cents,
        "currency": body.currency.upper(),
        "fx_rate": 1.0,
        "net_amount": net_amount,
        "fee_amount": fee_amount,
        "amount_usd": body.amount_usd,
        "net_amount_usd": net_amount / 100.0,
        "fee_amount_usd": fee_amount / 100.0,
        "customer_id": body.customer_id,
        "merchant_account_id": STRIPE_ACCOUNT_ID,
        "product_line": body.product_line or "subscriptions",
        "department": body.department or "engineering",
        "account_code": body.account_code or "4000-revenue",
        "cost_center": body.cost_center or "CC-ENG-001",
        "basis": body.basis,
        "decline_code": body.decline_code,
        "risk_level": "normal",
        "dispute_id": None,
        "dispute_status": None,
        "is_recurring": body.is_recurring,
        "description": body.description or f"Manual {body.type}",
        "metadata_json": '{"source": "manual_entry"}',
        "ingested_at": now,
        "batch_id": f"manual_{now.strftime('%Y%m%d_%H%M%S')}",
    }
    row.update(_date_fields(now))

    try:
        upsert_transactions([row], DUCKDB_PATH)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e

    return {
        "status": "created",
        "transaction_id": txn_id,
        "amount_usd": body.amount_usd,
        "type": body.type,
        "source": body.source,
    }


@app.get("/transactions/recent")
async def recent_transactions(limit: int = 20):
    """Return the most recent N transactions for the live feed."""
    try:
        with _db_lock:
            conn = get_conn(DUCKDB_PATH)
            rows = conn.execute(
                """
                SELECT
                    transaction_id,
                    occurred_at,
                    type,
                    status,
                    source,
                    amount_usd,
                    net_amount_usd,
                    fee_amount_usd,
                    currency,
                    product_line,
                    description,
                    decline_code,
                    ingested_at
                FROM transactions
                ORDER BY ingested_at DESC
                LIMIT ?
            """,
                [limit],
            ).fetchall()
            cols = [
                "transaction_id",
                "occurred_at",
                "type",
                "status",
                "source",
                "amount_usd",
                "net_amount_usd",
                "fee_amount_usd",
                "currency",
                "product_line",
                "description",
                "decline_code",
                "ingested_at",
            ]
            result = []
            for row in rows:
                d = dict(zip(cols, row, strict=False))
                # Serialize datetimes
                for k in ("occurred_at", "ingested_at"):
                    if d[k] is not None:
                        d[k] = d[k].isoformat() if hasattr(d[k], "isoformat") else str(d[k])
                result.append(d)
        return {"transactions": result, "count": len(result)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.get("/stats/live")
async def live_stats():
    """Return live aggregate stats for dashboard refresh."""
    try:
        with _db_lock:
            conn = get_conn(DUCKDB_PATH)

            total = conn.execute("SELECT COUNT(*) FROM transactions").fetchone()[0]

            today = conn.execute("""
                SELECT
                    COUNT(*) AS volume,
                    COALESCE(SUM(amount_usd), 0) AS total_usd,
                    COALESCE(
                        COUNT(*) FILTER (WHERE status = 'succeeded') * 1.0 / NULLIF(COUNT(*), 0),
                        0
                    ) AS success_rate
                FROM transactions
                WHERE occurred_date = (SELECT MAX(occurred_date) FROM transactions WHERE occurred_date IS NOT NULL)
            """).fetchone()

            last_ingested = conn.execute("SELECT MAX(ingested_at) FROM transactions").fetchone()[0]

            by_source = conn.execute("""
                SELECT source, COUNT(*) AS cnt
                FROM transactions
                GROUP BY source
                ORDER BY cnt DESC
            """).fetchall()

        return {
            "total_transactions": total,
            "today": {
                "volume": today[0],
                "total_usd": round(today[1], 2),
                "success_rate": round(today[2] * 100, 1),
            },
            "last_ingested": last_ingested.isoformat() if last_ingested else None,
            "by_source": {r[0]: r[1] for r in by_source},
            "timestamp": datetime.now().isoformat(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


# =============================================================================
# UNIFIED ANALYTICS & REPORTING ENDPOINTS
# =============================================================================


@app.get("/reports/executive")
async def report_executive():
    """Return executive-level KPIs and 30-day cash trajectory."""
    try:
        with _db_lock:
            conn = get_conn(DUCKDB_PATH)
            cash = conn.execute(
                "SELECT cumulative_cash_usd FROM analytics.daily_cash_position ORDER BY date DESC LIMIT 1"
            ).fetchone()
            runway = conn.execute(
                "SELECT p50_runway_days FROM analytics.forecasts ORDER BY forecast_date DESC LIMIT 1"
            ).fetchone()
            success_rate = conn.execute(
                "SELECT success_rate FROM analytics.success_rate_daily ORDER BY occurred_date DESC LIMIT 1"
            ).fetchone()
            burn = conn.execute(
                "SELECT SUM(outflows_usd) / 30.0 FROM analytics.daily_cash_position WHERE date >= CURRENT_DATE - INTERVAL '30 days'"
            ).fetchone()
            total_txns = conn.execute("SELECT COUNT(*) FROM transactions").fetchone()[0]
            last_ingested = conn.execute("SELECT MAX(ingested_at) FROM transactions").fetchone()[0]

            cash_trend = conn.execute("""
                SELECT date, cumulative_cash_usd, net_flow_usd, inflows_usd, outflows_usd
                FROM analytics.daily_cash_position
                ORDER BY date DESC
                LIMIT 30
            """).fetchall()
            cash_trend = list(
                reversed(
                    [
                        {
                            "date": str(r[0]),
                            "cash": round(r[1] or 0, 2),
                            "net": round(r[2] or 0, 2),
                            "inflows": round(r[3] or 0, 2),
                            "outflows": round(r[4] or 0, 2),
                        }
                        for r in cash_trend
                    ]
                )
            )

        return {
            "current_cash": round(cash[0] or 0, 2) if cash else 0,
            "runway_p50": runway[0] if runway else 0,
            "success_rate_24h": round((success_rate[0] or 0) * 100, 1) if success_rate else 0,
            "net_burn_30d": round(burn[0] or 0, 2) if burn else 0,
            "total_transactions": total_txns,
            "last_ingested": last_ingested.isoformat() if last_ingested else None,
            "cash_trend": cash_trend,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.get("/reports/cashflow")
async def report_cashflow():
    """Return 13-week ML forecast fan chart data and weekly net cash flows."""
    try:
        with _db_lock:
            conn = get_conn(DUCKDB_PATH)
            forecast = conn.execute("""
                SELECT
                    prediction_date,
                    p10_cumulative_cash_usd,
                    p50_cumulative_cash_usd,
                    p90_cumulative_cash_usd,
                    p50_inflows_usd,
                    p50_outflows_usd
                FROM analytics.forecasts
                ORDER BY prediction_date
            """).fetchall()

            weekly = conn.execute("""
                SELECT
                    DATE_TRUNC('week', date)::DATE AS week_start,
                    SUM(inflows_usd) AS inflows_usd,
                    SUM(outflows_usd) AS outflows_usd,
                    SUM(net_flow_usd) AS net_flow_usd
                FROM analytics.daily_cash_position
                GROUP BY DATE_TRUNC('week', date)
                ORDER BY week_start DESC
                LIMIT 12
            """).fetchall()
            weekly = list(
                reversed(
                    [
                        {
                            "week": str(r[0]),
                            "inflows": round(r[1] or 0, 2),
                            "outflows": round(r[2] or 0, 2),
                            "net": round(r[3] or 0, 2),
                        }
                        for r in weekly
                    ]
                )
            )

        return {
            "forecast": [
                {
                    "date": str(r[0]),
                    "p10": round(r[1] or 0, 2),
                    "p50": round(r[2] or 0, 2),
                    "p90": round(r[3] or 0, 2),
                    "inflows": round(r[4] or 0, 2),
                    "outflows": round(r[5] or 0, 2),
                }
                for r in forecast
            ],
            "weekly": weekly,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.get("/reports/revenue")
async def report_revenue():
    """Return monthly revenue breakdown by product line and P&L by account code."""
    try:
        with _db_lock:
            conn = get_conn(DUCKDB_PATH)
            rev = conn.execute("""
                SELECT month, product_line, revenue_usd, net_revenue_usd
                FROM analytics.revenue_by_product
                ORDER BY month DESC, product_line
            """).fetchall()

            pl = conn.execute("""
                SELECT month, account_code, net_usd
                FROM analytics.monthly_pl
                ORDER BY month DESC, account_code
            """).fetchall()

        return {
            "revenue_by_product": [
                {
                    "month": str(r[0]),
                    "product_line": r[1],
                    "revenue": round(r[2] or 0, 2),
                    "net_revenue": round(r[3] or 0, 2),
                }
                for r in rev
            ],
            "monthly_pl": [
                {"month": str(r[0]), "account_code": r[1], "net": round(r[2] or 0, 2)} for r in pl
            ],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.get("/reports/ops")
async def report_ops():
    """Return payment gateway success rates, top decline codes, and AI retry predictions."""
    try:
        with _db_lock:
            conn = get_conn(DUCKDB_PATH)
            success_trend = conn.execute("""
                SELECT occurred_date, source, success_rate
                FROM analytics.success_rate_daily
                ORDER BY occurred_date DESC, source
                LIMIT 60
            """).fetchall()

            declines = conn.execute("""
                SELECT decline_code, total_declines
                FROM analytics.decline_analysis
                ORDER BY total_declines DESC
                LIMIT 10
            """).fetchall()

            advisor = conn.execute("""
                SELECT
                    transaction_id,
                    decline_code,
                    card_brand,
                    card_funding,
                    amount_usd,
                    retry_success_probability,
                    recommended_action,
                    expected_recovery_usd
                FROM ml.decline_predictions
                LIMIT 20
            """).fetchall()

            disputes = conn.execute("""
                SELECT
                    dispute_id,
                    transaction_id,
                    customer_id,
                    amount_usd,
                    dispute_status,
                    dispute_created_at,
                    due_by
                FROM analytics.disputes
                LIMIT 20
            """).fetchall()

        return {
            "success_trend": [
                {"date": str(r[0]), "source": r[1], "rate": round((r[2] or 0) * 100, 1)}
                for r in success_trend
            ],
            "declines": [{"code": r[0] or "unknown", "count": r[1]} for r in declines],
            "retry_advisor": [
                {
                    "transaction_id": r[0],
                    "decline_code": r[1],
                    "brand": r[2],
                    "funding": r[3],
                    "amount_usd": round(r[4] or 0, 2),
                    "probability": round((r[5] or 0) * 100, 1),
                    "action": r[6],
                    "recovery_usd": round(r[7] or 0, 2),
                }
                for r in advisor
            ],
            "disputes": [
                {
                    "dispute_id": r[0],
                    "transaction_id": r[1],
                    "customer_id": r[2],
                    "amount_usd": round(r[3] or 0, 2),
                    "status": r[4],
                    "created_at": str(r[5]) if r[5] else None,
                    "due_by": str(r[6]) if r[6] else None,
                }
                for r in disputes
            ],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.get("/reports/ar-aging")
async def report_ar_aging():
    """Return accounts receivable aging report."""
    try:
        with _db_lock:
            conn = get_conn(DUCKDB_PATH)
            aging = conn.execute("""
                SELECT
                    customer_id,
                    customer_name,
                    invoice_count,
                    total_outstanding_usd,
                    current_usd,
                    days_31_60_usd,
                    days_61_90_usd,
                    days_90_plus_usd
                FROM analytics.ar_aging
                ORDER BY total_outstanding_usd DESC
                LIMIT 50
            """).fetchall()

        return {
            "aging": [
                {
                    "customer_id": r[0],
                    "customer_name": r[1],
                    "invoices": r[2],
                    "total": round(r[3] or 0, 2),
                    "current": round(r[4] or 0, 2),
                    "days_31_60": round(r[5] or 0, 2),
                    "days_61_90": round(r[6] or 0, 2),
                    "days_90_plus": round(r[7] or 0, 2),
                }
                for r in aging
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


# =============================================================================
# STRIPE WEBHOOK
# =============================================================================


@app.post("/webhooks/stripe")
async def stripe_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    stripe_signature: str | None = Header(None),
):
    """Receive Stripe webhook events and ingest transactions in real-time."""
    payload = await request.body()

    if STRIPE_WEBHOOK_SECRET and stripe_signature:
        try:
            event = stripe.Webhook.construct_event(payload, stripe_signature, STRIPE_WEBHOOK_SECRET)
        except ValueError as e:
            console.log(f"[red]Invalid payload: {e}[/red]")
            raise HTTPException(status_code=400, detail="Invalid payload") from e
        except stripe.error.SignatureVerificationError as e:
            console.log(f"[red]Invalid signature: {e}[/red]")
            raise HTTPException(status_code=400, detail="Invalid signature") from e
        event = dict(event)
    else:
        # Dev mode: skip verification
        event = json.loads(payload)

    console.log(f"[blue]Stripe webhook:[/blue] {event.get('type')} - {event.get('id')}")

    normalized = normalize_stripe_event(event, STRIPE_ACCOUNT_ID)
    if normalized:
        background_tasks.add_task(_ingest_single, normalized)
        return {"status": "accepted", "event_id": event.get("id")}
    return {"status": "ignored", "event_id": event.get("id"), "reason": "unsupported_event_type"}


# =============================================================================
# PLAID WEBHOOK
# =============================================================================


@app.post("/webhooks/plaid")
async def plaid_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    plaid_verification: str | None = Header(None, alias="Plaid-Verification"),
):
    """Receive Plaid webhooks (transactions updated, removed, etc.)."""
    payload = await request.body()
    webhook_data = json.loads(payload)

    console.log(
        f"[blue]Plaid webhook:[/blue] {webhook_data.get('webhook_type')} - {webhook_data.get('webhook_code')}"
    )

    if PLAID_WEBHOOK_SECRET and plaid_verification:
        expected = hmac.new(
            PLAID_WEBHOOK_SECRET.encode(),
            payload,
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(expected, plaid_verification):
            console.log("[red]Invalid Plaid webhook signature[/red]")
            raise HTTPException(status_code=400, detail="Invalid signature")

    webhook_type = webhook_data.get("webhook_type")
    webhook_code = webhook_data.get("webhook_code")
    item_id = webhook_data.get("item_id")

    if webhook_type == "TRANSACTIONS" and webhook_code in [
        "SYNC_UPDATES_AVAILABLE",
        "INITIAL_UPDATE_COMPLETE",
        "HISTORICAL_UPDATE_COMPLETE",
    ]:
        background_tasks.add_task(_sync_plaid_item, item_id)
        return {"status": "accepted", "item_id": item_id, "action": "queued_sync"}

    if webhook_type == "TRANSACTIONS" and webhook_code == "TRANSACTIONS_REMOVED":
        removed_ids = webhook_data.get("transactions_removed", [])
        if removed_ids:
            background_tasks.add_task(_remove_plaid_transactions, removed_ids)
        return {
            "status": "accepted",
            "item_id": item_id,
            "action": "queued_removal",
            "count": len(removed_ids),
        }

    return {"status": "ignored", "webhook_type": webhook_type, "webhook_code": webhook_code}


# =============================================================================
# HEALTH & MONITORING
# =============================================================================


@app.get("/health")
async def health_check():
    """Health check for container orchestration."""
    try:
        with _db_lock:
            conn = get_conn(DUCKDB_PATH)
            count = conn.execute("SELECT COUNT(*) FROM transactions").fetchone()[0]
        return {"status": "healthy", "transactions": count, "demo_mode": DEMO_MODE}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}


@app.get("/metrics")
async def metrics():
    """Basic metrics for monitoring."""
    try:
        with _db_lock:
            conn = get_conn(DUCKDB_PATH)
            recent = conn.execute("""
                SELECT source, status, COUNT(*) AS count
                FROM transactions
                WHERE occurred_at >= NOW() - INTERVAL '1 hour'
                GROUP BY source, status
            """).fetchall()
        return {
            "recent_transactions": [
                {"source": r[0], "status": r[1], "count": r[2]} for r in recent
            ],
            "timestamp": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        return {"error": str(e)}


# =============================================================================
# BACKGROUND HELPERS
# =============================================================================


async def _ingest_single(transaction: dict):
    try:
        count = upsert_transactions([transaction], DUCKDB_PATH)
        console.log(
            f"[green]Ingested[/green] {transaction['transaction_id']} "
            f"(total {transaction['source']}: {count})"
        )
    except Exception as e:
        console.log(f"[red]Failed to ingest {transaction.get('transaction_id')}: {e}[/red]")


async def _sync_plaid_item(item_id: str):
    try:
        from scripts.ingestion.ingest_plaid import fetch_transactions, get_plaid_client

        client = get_plaid_client()
        console.log(f"[blue]Syncing Plaid item:[/blue] {item_id}")
        txns, _cursor = fetch_transactions(client, item_id)

        transactions = []
        for txn in txns:
            txn_dict = {
                "transaction_id": txn.transaction_id,
                "date": str(txn.date),
                "amount": txn.amount,
                "iso_currency_code": txn.iso_currency_code,
                "category": txn.category,
                "category_id": txn.category_id,
                "name": txn.name,
                "merchant_name": txn.merchant_name,
                "pending": txn.pending,
            }
            normalized = normalize_plaid_transaction(txn_dict, item_id)
            if normalized:
                transactions.append(normalized)

        if transactions:
            count = upsert_transactions(transactions, DUCKDB_PATH)
            console.log(f"[green]Plaid sync complete:[/green] {count} transactions for {item_id}")

    except Exception as e:
        console.log(f"[red]Plaid sync failed for {item_id}: {e}[/red]")


async def _remove_plaid_transactions(transaction_ids: list[str]):
    try:
        with _db_lock:
            conn = get_conn(DUCKDB_PATH)
            for txn_id in transaction_ids:
                conn.execute(
                    "UPDATE transactions SET status = 'removed' WHERE transaction_id = ?",
                    [f"plaid_{txn_id}"],
                )
        console.log(f"[yellow]Marked {len(transaction_ids)} Plaid transactions as removed[/yellow]")
    except Exception as e:
        console.log(f"[red]Failed to remove transactions: {e}[/red]")


# =============================================================================
# ENTRY POINT
# =============================================================================


def main():
    import argparse

    import uvicorn

    parser = argparse.ArgumentParser(description="LedgerFlow Webhook Receiver + Live Input")
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=8080)
    parser.add_argument("--reload", action="store_true", help="Enable auto-reload for development")
    args = parser.parse_args()

    console.rule("[bold blue]LedgerFlow Live API[/bold blue]")
    console.log(f"Starting on http://{args.host}:{args.port}")
    console.log(f"Live Input UI: http://localhost:{args.port}/")
    console.log(f"API Docs:      http://localhost:{args.port}/docs")
    console.log(f"DuckDB:        {DUCKDB_PATH}")
    console.log(f"Demo mode:     {'ON' if DEMO_MODE else 'OFF'} (set DEMO_MODE=false to disable)")
    console.log(f"Stripe secret: {'configured' if STRIPE_WEBHOOK_SECRET else 'not set (dev mode)'}")

    uvicorn.run(
        "scripts.api.webhooks:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
        log_level="info",
    )


if __name__ == "__main__":
    main()
