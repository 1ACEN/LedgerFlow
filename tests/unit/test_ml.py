#!/usr/bin/env python3
"""
Unit tests for ML model training and prediction (PostgreSQL).
"""

import datetime

import numpy as np
import polars as pl
import pytest

from scripts.db.connection import copy_upsert_dataframe
from scripts.ml.train_forecast import evaluate_model, prepare_features, train_quantile_model


class TestMLModels:
    """Tests for ML training pipelines."""

    @pytest.fixture
    def sample_db(self, pg_conn):
        """Seed isolated PostgreSQL database with 120 days of synthetic cash flow data."""
        today = datetime.date.today()
        dates = [today - datetime.timedelta(days=120 - i) for i in range(120)]
        np.random.seed(42)

        base_flow = 1000 + np.arange(120) * 2
        weekly = 500 * np.sin(np.arange(120) * 2 * np.pi / 7)
        noise = np.random.normal(0, 100, 120)
        net_flow = base_flow + weekly + noise
        inflows = np.maximum(net_flow + np.random.normal(2000, 200, 120), 0)

        rows = []
        for idx, d in enumerate(dates):
            dt = datetime.datetime.combine(d, datetime.time(12, 0), tzinfo=datetime.UTC)
            rows.append(
                {
                    "transaction_id": f"txn_{idx + 1}",
                    "idempotency_key": f"idem_{idx + 1}",
                    "occurred_at": dt,
                    "posted_at": dt,
                    "occurred_date": d,
                    "posted_date": d,
                    "type": "charge",
                    "status": "succeeded",
                    "source": "stripe",
                    "amount": int(round(inflows[idx] * 100)),
                    "currency": "USD",
                    "fx_rate": 1.0,
                    "net_amount": int(round(net_flow[idx] * 100)),
                    "fee_amount": 0,
                    "customer_id": "cus_001",
                    "basis": "cash",
                    "decline_code": None,
                    "risk_level": "normal",
                    "dispute_id": None,
                    "dispute_status": None,
                    "is_recurring": False,
                    "description": "Test transaction",
                    "metadata_json": "{}",
                    "batch_id": "batch_test",
                }
            )

        df = pl.DataFrame(rows)
        copy_upsert_dataframe(pg_conn, "transactions", df, conflict_cols=["transaction_id"])
        return pg_conn

    def test_prepare_features_forecast(self, sample_db):
        """Test feature preparation for cash flow forecast."""
        X_train, _y_train, X_val, _y_val, feature_cols, _val_df = prepare_features(
            sample_db, lookback_days=90
        )

        assert len(X_train) > 0
        assert len(X_val) > 0
        assert len(feature_cols) > 10
        assert "net_flow_lag_1d" in feature_cols
        assert "net_flow_ma_7d" in feature_cols
        assert "dow" in feature_cols

    def test_train_quantile_model(self, sample_db):
        """Test quantile model training."""
        X_train, y_train, X_val, y_val, feature_cols, _ = prepare_features(
            sample_db, lookback_days=90
        )

        model = train_quantile_model(
            X_train, y_train, X_val, y_val, alpha=0.5, feature_cols=feature_cols
        )

        assert model is not None
        assert model.best_iteration > 0

        metrics = evaluate_model(model, X_val, y_val, alpha=0.5)
        assert "mae" in metrics
        assert "pinball_loss" in metrics
        assert metrics["mae"] >= 0

    def test_prepare_retry_features(self, sample_db):
        """Test feature preparation and scoring for decline retry model."""
        from scripts.ml.train_retry import prepare_features as prepare_retry_features

        # Insert 150 synthetic decline events + matching customer retries
        sample_db.execute("""
            INSERT INTO transactions
            (transaction_id, idempotency_key, occurred_at, posted_at, type, status, source,
             amount, currency, fx_rate, net_amount, fee_amount, customer_id, basis, decline_code,
             metadata_json)
            SELECT
                'txn_fail_' || gs,
                'idem_fail_' || gs,
                NOW() - INTERVAL '150 days' + (INTERVAL '1 hour' * gs),
                NOW() - INTERVAL '150 days' + (INTERVAL '1 hour' * gs),
                'charge', 'failed', 'stripe',
                5000, 'USD', 1.0, 5000, 0,
                'cus_' || LPAD(((gs % 10) + 1)::VARCHAR, 3, '0'),
                'cash',
                (ARRAY['insufficient_funds','card_declined','expired_card','processing_error'])[1 + (gs % 4)],
                '{"card_brand": "Visa", "card_funding": "credit"}'::jsonb
            FROM generate_series(1, 150) AS gs
        """)

        X_train, _y_train, X_val, _y_val, feature_cols, _val_df = prepare_retry_features(sample_db)
        assert len(X_train) > 0
        assert len(X_val) > 0
        assert "decline_code_enc" in feature_cols
        assert "card_brand_enc" in feature_cols
        assert "card_funding_enc" in feature_cols
        assert "log_amount_usd" in feature_cols


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
