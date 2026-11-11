#!/usr/bin/env python3
"""
Unit tests for live data input, normalization, and webhooks API endpoints.
"""

from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient

from scripts.api.webhooks import app
from scripts.ingestion.common import (
    _date_fields,
    normalize_plaid_transaction,
    normalize_stripe_event,
    upsert_transactions,
)


class TestLiveInput:
    """Tests for live data input normalization and database upsert."""

    def test_date_fields(self):
        """Verify derived date fields are correctly computed from datetime."""
        dt = datetime(2026, 8, 25, 14, 30, 0)
        fields = _date_fields(dt)

        assert fields["occurred_date"] == dt.date()
        assert fields["posted_date"] == dt.date()
        assert fields["occurred_hour"] == 14
        assert fields["occurred_month"] == 8
        assert fields["occurred_year"] == 2026
        assert fields["occurred_quarter"] == 3

    def test_normalize_stripe_event(self):
        """Test Stripe webhook normalization."""
        event = {
            "id": "evt_test123",
            "type": "charge.succeeded",
            "created": 1787673600,
            "data": {
                "object": {
                    "id": "ch_test123",
                    "amount": 15000,
                    "currency": "usd",
                    "status": "succeeded",
                    "customer": "cus_test456",
                    "description": "Test subscription",
                    "metadata": {"product_line": "subscriptions"},
                }
            },
        }
        normalized = normalize_stripe_event(event, "acct_test")

        assert normalized is not None
        assert normalized["transaction_id"] == "ch_test123"
        assert normalized["type"] == "charge"
        assert normalized["status"] == "succeeded"
        assert normalized["amount"] == 15000
        assert normalized["fee_amount"] == int(15000 * 0.029 + 30)
        assert normalized["net_amount"] == 15000 - normalized["fee_amount"]
        assert normalized["source"] == "stripe"
        assert normalized["merchant_account_id"] == "acct_test"

        # Verify signed accounting for refunds
        refund_event = {
            "id": "evt_ref_123",
            "type": "charge.refunded",
            "created": 1787673600,
            "data": {
                "object": {
                    "id": "ch_ref_123",
                    "amount": 5000,
                    "currency": "usd",
                    "status": "succeeded",
                    "customer": "cus_test456",
                }
            },
        }
        ref_norm = normalize_stripe_event(refund_event, "acct_test")
        assert ref_norm is not None
        assert ref_norm["type"] == "refund"
        assert ref_norm["net_amount"] == -5000

    def test_normalize_plaid_transaction(self):
        """Test Plaid bank feed transaction normalization."""
        txn = {
            "transaction_id": "plaid_tx_999",
            "date": "2026-08-25",
            "amount": 45.50,
            "iso_currency_code": "USD",
            "category": ["SOFTWARE_SUBSCRIPTIONS"],
            "name": "AWS Cloud Services",
            "pending": False,
        }
        normalized = normalize_plaid_transaction(txn, "bank_acct_01")

        assert normalized is not None
        assert normalized["transaction_id"] == "plaid_plaid_tx_999"
        assert normalized["type"] == "charge"
        assert normalized["status"] == "succeeded"
        assert normalized["amount"] == 4550  # cents
        assert normalized["net_amount"] == -4550  # debit outflow is negative
        assert normalized["source"] == "plaid"
        assert normalized["product_line"] == "engineering"

        # Test Plaid credit (inflow deposit)
        credit_txn = {
            "transaction_id": "plaid_tx_credit",
            "date": "2026-08-25",
            "amount": -1200.00,  # Plaid negative = credit/inflow
            "iso_currency_code": "USD",
            "category": ["INCOME_WAGES"],
            "name": "Customer Direct Deposit",
            "pending": False,
        }
        cred_norm = normalize_plaid_transaction(credit_txn, "bank_acct_01")
        assert cred_norm is not None
        assert cred_norm["net_amount"] == 120000  # positive inflow in cents

    def test_upsert_transactions_deduplication(self, pg_test_url, pg_conn):
        """Test that upserting duplicate transactions updates rather than duplicates."""
        now = datetime.now(UTC)
        txn = {
            "transaction_id": "test_txn_uniq_01",
            "idempotency_key": "test_idem_uniq_01",
            "occurred_at": now,
            "posted_at": now,
            "type": "charge",
            "status": "succeeded",
            "source": "manual",
            "amount": 5000,
            "currency": "USD",
            "fx_rate": 1.0,
            "net_amount": 4825,
            "fee_amount": 175,
            "product_line": "subscriptions",
            "basis": "cash",
            "description": "Initial charge",
            "ingested_at": now,
            "batch_id": "batch_01",
        }
        txn.update(_date_fields(now))

        # First insert
        count1 = upsert_transactions([txn], pg_test_url)
        assert count1 == 1

        # Update status and re-insert
        txn["status"] = "refunded"
        count2 = upsert_transactions([txn], pg_test_url)
        assert count2 == 1  # Total count unchanged

        # Verify in DB
        row = pg_conn.execute(
            "SELECT status, amount_usd, net_amount_usd FROM transactions WHERE transaction_id = 'test_txn_uniq_01'"
        ).fetchone()

        assert row[0] == "refunded"
        assert row[1] == 50.0
        assert row[2] == 48.25


class TestAPIEndpoints:
    """Tests for FastAPI live data and webhook endpoints."""

    @pytest.fixture
    def client(self, pg_test_url, monkeypatch):
        monkeypatch.setattr("scripts.api.webhooks.DATABASE_URL", pg_test_url)
        return TestClient(app)

    def test_health_endpoint(self, client):
        """Verify GET /health returns 200 and healthy status."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "transactions" in data

    def test_manual_transaction_endpoint(self, client):
        """Verify POST /transactions/manual creates a new transaction."""
        payload = {
            "amount_usd": 189.50,
            "type": "charge",
            "status": "succeeded",
            "source": "manual",
            "currency": "USD",
            "product_line": "professional_services",
            "description": "Consulting Fee",
        }
        response = client.post("/transactions/manual", json=payload)
        assert response.status_code == 201
        data = response.json()
        assert data["status"] == "created"
        assert data["amount_usd"] == 189.50
        assert data["type"] == "charge"
        assert "transaction_id" in data

    def test_recent_transactions_endpoint(self, client):
        """Verify GET /transactions/recent returns a list of transactions."""
        response = client.get("/transactions/recent?limit=5")
        assert response.status_code == 200
        data = response.json()
        assert "transactions" in data
        assert "count" in data
        assert isinstance(data["transactions"], list)

    def test_live_stats_endpoint(self, client):
        """Verify GET /stats/live returns aggregate metrics."""
        response = client.get("/stats/live")
        assert response.status_code == 200
        data = response.json()
        assert "total_transactions" in data
        assert "today" in data
        assert "by_source" in data

    def test_root_endpoint(self, client):
        """Verify GET / serves dashboard HTML with no-store cache headers."""
        response = client.get("/")
        assert response.status_code == 200
        assert "text/html" in response.headers["content-type"]
        assert "no-store" in response.headers.get("cache-control", "")

    def test_ar_aging_report_endpoint(self, client):
        """Verify GET /reports/ar-aging returns accounts receivable aging report."""
        response = client.get("/reports/ar-aging")
        assert response.status_code == 200
        data = response.json()
        assert "aging" in data
        assert isinstance(data["aging"], list)
        if data["aging"]:
            row = data["aging"][0]
            for key in [
                "customer_id",
                "invoices",
                "total",
                "current",
                "days_31_60",
                "days_61_90",
                "days_90_plus",
            ]:
                assert key in row

        # Assert enriched collections and risk intelligence sections
        for enriched_key in ["summary", "buckets", "collection_efficiency", "high_risk_accounts"]:
            assert enriched_key in data
        assert data["summary"]["total_outstanding_usd"] >= 0
        assert len(data["buckets"]) == 4
        assert data["collection_efficiency"]["dso_days"] >= 0

    def test_revenue_report_endpoint(self, client):
        """Verify GET /reports/revenue returns revenue by product and monthly P&L."""
        response = client.get("/reports/revenue")
        assert response.status_code == 200
        data = response.json()
        assert "revenue_by_product" in data
        assert "monthly_pl" in data
        assert isinstance(data["revenue_by_product"], list)
        assert isinstance(data["monthly_pl"], list)
        if data["revenue_by_product"]:
            row = data["revenue_by_product"][0]
            for key in ["month", "product_line", "revenue", "net_revenue"]:
                assert key in row
        for enriched_key in [
            "financial_summary",
            "revenue_by_customer_tier",
            "top_customers",
            "expenses_by_department",
            "budget_vs_actual",
            "financial_performance_trends",
            "forecasting",
            "debt_capital_structure",
        ]:
            assert enriched_key in data
        assert "gross_margin_pct" in data["financial_summary"]
        assert "operating_margin_pct" in data["financial_summary"]
        assert "net_margin_pct" in data["financial_summary"]
        assert isinstance(data["revenue_by_customer_tier"], list)
        assert isinstance(data["top_customers"], list)
        assert isinstance(data["expenses_by_department"], list)
        assert isinstance(data["budget_vs_actual"], list)

    def test_cashflow_report_endpoint(self, client):
        """Verify GET /reports/cashflow returns forecast fan chart data and weekly flows."""
        response = client.get("/reports/cashflow")
        assert response.status_code == 200
        data = response.json()
        assert "forecast" in data
        assert "weekly" in data
        assert isinstance(data["forecast"], list)
        assert isinstance(data["weekly"], list)
        if data["forecast"]:
            row = data["forecast"][0]
            for key in ["date", "p10", "p50", "p90", "inflows", "outflows"]:
                assert key in row
        if data["weekly"]:
            w_row = data["weekly"][0]
            for key in ["week", "inflows", "outflows", "net"]:
                assert key in w_row
        for enriched_key in [
            "current_cash_reserves",
            "net_cash_flow_30d",
            "operating_cash_flow_30d",
            "free_cash_flow_30d",
            "inflows_breakdown",
            "outflows_breakdown",
            "monthly_trends",
            "quarterly_trends",
            "actual_history_30d",
            "scenarios",
        ]:
            assert enriched_key in data
        assert isinstance(data["inflows_breakdown"], list)
        assert isinstance(data["outflows_breakdown"], list)
        assert isinstance(data["monthly_trends"], list)
        assert isinstance(data["quarterly_trends"], list)
        assert "worst_case" in data["scenarios"]
        assert "base_case" in data["scenarios"]
        assert "best_case" in data["scenarios"]

    def test_executive_report_endpoint(self, client):
        """Verify GET /reports/executive returns cash, runway, and cash trajectory trend."""
        response = client.get("/reports/executive")
        assert response.status_code == 200
        data = response.json()
        for key in [
            "current_cash",
            "runway_p50",
            "success_rate_24h",
            "net_burn_30d",
            "total_transactions",
            "last_ingested",
            "cash_trend",
        ]:
            assert key in data
        assert isinstance(data["cash_trend"], list)
        if data["cash_trend"]:
            row = data["cash_trend"][0]
            for key in ["date", "cash", "net", "inflows", "outflows"]:
                assert key in row

    def test_ops_report_endpoint(self, client):
        """Verify GET /reports/ops returns declines, success trends, retry advisor, and disputes."""
        response = client.get("/reports/ops")
        assert response.status_code == 200
        data = response.json()
        for key in ["declines", "success_trend", "retry_advisor", "disputes"]:
            assert key in data
            assert isinstance(data[key], list)
        if data["declines"]:
            for key in ["code", "count"]:
                assert key in data["declines"][0]
        if data["success_trend"]:
            for key in ["date", "source", "rate"]:
                assert key in data["success_trend"][0]
        if data["retry_advisor"]:
            for key in [
                "transaction_id",
                "decline_code",
                "brand",
                "funding",
                "amount_usd",
                "probability",
                "action",
                "recovery_usd",
            ]:
                assert key in data["retry_advisor"][0]
        if data["disputes"]:
            for key in ["dispute_id", "transaction_id", "customer_id", "amount_usd", "status"]:
                assert key in data["disputes"][0]
        for enriched_key in [
            "transaction_monitoring",
            "ai_anomaly_detection",
            "payment_processing_metrics",
            "fraud_risk_indicators",
            "automation_performance",
            "ai_insights",
        ]:
            assert enriched_key in data
        assert "overall_success_rate" in data["transaction_monitoring"]
        assert "system_health_score" in data["ai_anomaly_detection"]
        assert isinstance(data["payment_processing_metrics"]["gateways"], list)
        assert "dispute_rate_bps" in data["fraud_risk_indicators"]
        assert "automated_recovery_rate_pct" in data["automation_performance"]
        assert isinstance(data["ai_insights"], list)

    def test_static_assets_mounted(self, client):
        """Verify static assets route is mounted."""
        mount_paths = [route.path for route in app.routes if hasattr(route, "path")]
        assert "/assets" in mount_paths

    def test_stripe_webhook_authenticated_success(self, client, monkeypatch):
        """Verify authenticated Stripe webhook event is accepted."""
        import json
        import time

        import stripe

        secret = "whsec_test_secret_stripe_999"
        monkeypatch.setattr("scripts.api.webhooks.STRIPE_WEBHOOK_SECRET", secret)

        event_payload = {
            "id": "evt_auth_test_123",
            "type": "charge.succeeded",
            "created": int(time.time()),
            "data": {
                "object": {
                    "id": "ch_auth_test_123",
                    "amount": 25000,
                    "currency": "usd",
                    "status": "succeeded",
                    "customer": "cus_auth_test",
                    "description": "Authenticated Webhook Test",
                    "metadata": {"product_line": "subscriptions"},
                }
            },
        }
        payload_bytes = json.dumps(event_payload).encode("utf-8")
        timestamp = int(time.time())
        signed_payload = f"{timestamp}.{payload_bytes.decode('utf-8')}"
        sig = stripe.WebhookSignature._compute_signature(signed_payload, secret)
        sig_header = f"t={timestamp},v1={sig}"

        response = client.post(
            "/webhooks/stripe",
            content=payload_bytes,
            headers={"stripe-signature": sig_header, "content-type": "application/json"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "accepted"
        assert data["event_id"] == "evt_auth_test_123"

    def test_stripe_webhook_invalid_signature_rejected(self, client, monkeypatch):
        """Verify Stripe webhook with invalid signature is rejected with 400."""
        monkeypatch.setattr("scripts.api.webhooks.STRIPE_WEBHOOK_SECRET", "whsec_test_secret")

        response = client.post(
            "/webhooks/stripe",
            json={"id": "evt_fake", "type": "charge.succeeded"},
            headers={"stripe-signature": "t=12345,v1=bad_signature"},
        )
        assert response.status_code == 400

    def test_stripe_webhook_missing_signature_rejected(self, client, monkeypatch):
        """Verify Stripe webhook without signature is rejected when secret is set."""
        monkeypatch.setattr("scripts.api.webhooks.STRIPE_WEBHOOK_SECRET", "whsec_test_secret")

        response = client.post(
            "/webhooks/stripe",
            json={"id": "evt_fake", "type": "charge.succeeded"},
        )
        assert response.status_code == 400
        assert "Missing stripe-signature header" in response.json()["detail"]

    def test_plaid_webhook_authenticated_success(self, client, monkeypatch):
        """Verify authenticated Plaid webhook is accepted with valid HMAC."""
        import hashlib
        import hmac
        import json

        secret = "plaid_secret_test_xyz"
        monkeypatch.setattr("scripts.api.webhooks.PLAID_WEBHOOK_SECRET", secret)

        body = {
            "webhook_type": "TRANSACTIONS",
            "webhook_code": "SYNC_UPDATES_AVAILABLE",
            "item_id": "item_auth_test_456",
            "new_transactions": 5,
        }
        payload_bytes = json.dumps(body).encode("utf-8")
        sig = hmac.new(secret.encode(), payload_bytes, hashlib.sha256).hexdigest()

        response = client.post(
            "/webhooks/plaid",
            content=payload_bytes,
            headers={"Plaid-Verification": sig, "content-type": "application/json"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "accepted"
        assert data["action"] == "queued_sync"

    def test_plaid_webhook_invalid_signature_rejected(self, client, monkeypatch):
        """Verify Plaid webhook with invalid HMAC signature is rejected with 400."""
        monkeypatch.setattr("scripts.api.webhooks.PLAID_WEBHOOK_SECRET", "plaid_secret_test")

        response = client.post(
            "/webhooks/plaid",
            json={"webhook_type": "TRANSACTIONS", "webhook_code": "SYNC_UPDATES_AVAILABLE"},
            headers={"Plaid-Verification": "invalid_hex_digest"},
        )
        assert response.status_code == 400

    def test_plaid_webhook_missing_signature_rejected(self, client, monkeypatch):
        """Verify Plaid webhook without signature header is rejected when secret is set."""
        monkeypatch.setattr("scripts.api.webhooks.PLAID_WEBHOOK_SECRET", "plaid_secret_test")

        response = client.post(
            "/webhooks/plaid",
            json={"webhook_type": "TRANSACTIONS", "webhook_code": "SYNC_UPDATES_AVAILABLE"},
        )
        assert response.status_code == 400
        assert "Missing Plaid-Verification header" in response.json()["detail"]
