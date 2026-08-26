#!/usr/bin/env python3
"""
Unit tests for live data input, normalization, and webhooks API endpoints.
"""

import tempfile
from datetime import datetime
from pathlib import Path

import duckdb
import pytest
from fastapi.testclient import TestClient

from scripts.api.webhooks import app
from scripts.db.init_db import SCHEMA_SQL
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
        assert normalized["source"] == "plaid"
        assert normalized["product_line"] == "engineering"

    def test_upsert_transactions_deduplication(self):
        """Test that upserting duplicate transactions updates rather than duplicates."""
        with tempfile.TemporaryDirectory() as tmpdir:
            db_path = Path(tmpdir) / "test.duckdb"

            conn = duckdb.connect(str(db_path))
            conn.execute(SCHEMA_SQL)
            conn.close()

            now = datetime.utcnow()
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
            count1 = upsert_transactions([txn], db_path)
            assert count1 == 1

            # Update status and re-insert
            txn["status"] = "refunded"
            count2 = upsert_transactions([txn], db_path)
            assert count2 == 1  # Total count unchanged

            # Verify in DB
            conn = duckdb.connect(str(db_path))
            row = conn.execute(
                "SELECT status, amount_usd, net_amount_usd FROM transactions WHERE transaction_id = 'test_txn_uniq_01'"
            ).fetchone()
            conn.close()

            assert row[0] == "refunded"
            assert row[1] == 50.0
            assert row[2] == 48.25


class TestAPIEndpoints:
    """Tests for FastAPI live data and webhook endpoints."""

    @pytest.fixture
    def client(self):
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
