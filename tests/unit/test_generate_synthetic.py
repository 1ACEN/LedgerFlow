#!/usr/bin/env python3
"""
Unit tests for synthetic data generation.
"""

import tempfile
from pathlib import Path

import duckdb
import pytest

from scripts.utils.generate_synthetic import (
    generate_customers,
    generate_merchant_accounts,
    generate_transactions,
)


class TestGenerateSynthetic:
    """Tests for synthetic data generation functions."""

    def test_generate_customers(self):
        customers = generate_customers(10)
        assert len(customers) == 10
        assert "customer_id" in customers.columns
        assert "customer_email" in customers.columns
        assert "customer_name" in customers.columns
        assert all(c.startswith("cus_") for c in customers["customer_id"])

    def test_generate_merchant_accounts(self):
        merchants = generate_merchant_accounts(3)
        assert len(merchants) == 3
        assert "merchant_account_id" in merchants.columns
        assert all(m.startswith("acct_") for m in merchants["merchant_account_id"])

    def test_generate_transactions(self):
        customers = generate_customers(5)
        merchants = generate_merchant_accounts(2)

        start = __import__("datetime").datetime(2024, 1, 1)
        end = __import__("datetime").datetime(2024, 1, 31)

        transactions = generate_transactions(100, start, end, customers, merchants)

        assert len(transactions) == 100
        # Check required columns
        required_cols = [
            "transaction_id",
            "occurred_at",
            "type",
            "status",
            "source",
            "amount",
            "currency",
            "net_amount",
            "customer_id",
        ]
        for col in required_cols:
            assert col in transactions.columns

        # Check types
        assert (
            transactions["type"]
            .is_in(
                ["charge", "refund", "payout", "fee", "transfer", "invoice_payment", "adjustment"]
            )
            .all()
        )
        assert (
            transactions["status"]
            .is_in(["succeeded", "failed", "pending", "disputed", "canceled"])
            .all()
        )
        assert transactions["amount"].min() > 0

    def test_write_to_duckdb(self):
        """Integration test: write to DuckDB and read back."""
        customers = generate_customers(10)
        merchants = generate_merchant_accounts(2)
        start = __import__("datetime").datetime(2024, 1, 1)
        end = __import__("datetime").datetime(2024, 1, 2)
        transactions = generate_transactions(50, start, end, customers, merchants)

        with tempfile.TemporaryDirectory() as tmpdir:
            db_path = Path(tmpdir) / "test.duckdb"

            # Use the same write logic as the main script
            conn = duckdb.connect(str(db_path))

            transactions.write_parquet(
                Path(tmpdir) / "transactions",
                partition_by=["occurred_year", "occurred_month"],
                compression="zstd",
            )

            parquet_glob = (Path(tmpdir) / "transactions" / "**" / "*.parquet").as_posix()
            conn.execute(f"""
                CREATE OR REPLACE VIEW transactions AS
                SELECT * FROM read_parquet('{parquet_glob}')
                ORDER BY occurred_at;
            """)

            count = conn.execute("SELECT COUNT(*) FROM transactions").fetchone()[0]
            assert count == 50

            # Check derived columns exist
            cols = conn.execute("DESCRIBE transactions").fetchall()
            col_names = [c[0] for c in cols]
            assert "amount_usd" in col_names
            assert "net_amount_usd" in col_names
            assert "is_recurring" in col_names

            conn.close()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
