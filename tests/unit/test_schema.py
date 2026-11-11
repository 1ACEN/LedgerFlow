#!/usr/bin/env python3
"""
Unit tests for PostgreSQL database schema, generated columns, views, and indexes.
"""

import pytest


class TestSchema:
    """Tests for LedgerFlow PostgreSQL schema."""

    def test_core_tables_exist(self, pg_conn):
        """Verify core tables are created."""
        tables = pg_conn.execute("""
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name
        """).fetchall()
        table_names = [t[0] for t in tables]
        assert "transactions" in table_names
        assert "customers" in table_names
        assert "merchants" in table_names
        assert "users" in table_names

    def test_transactions_columns(self, pg_conn):
        """Verify transactions table has all required columns."""
        cols = pg_conn.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'transactions'
        """).fetchall()
        col_names = {c[0] for c in cols}

        required = {
            "transaction_id",
            "idempotency_key",
            "occurred_at",
            "posted_at",
            "type",
            "status",
            "source",
            "amount",
            "currency",
            "fx_rate",
            "net_amount",
            "fee_amount",
            "customer_id",
            "basis",
            "amount_usd",
            "net_amount_usd",
            "fee_amount_usd",
        }
        assert required.issubset(col_names)

    def test_generated_columns(self, pg_conn):
        """Test that STORED generated columns compute correctly."""
        pg_conn.execute("""
            INSERT INTO transactions
            (transaction_id, idempotency_key, occurred_at, posted_at, type, status, source,
             amount, currency, fx_rate, net_amount, fee_amount, customer_id, basis)
            VALUES
            ('txn_001', 'idem_001', '2024-01-15', '2024-01-15', 'charge', 'succeeded', 'stripe',
             10000, 'USD', 1.0, 9710, 290, 'cus_001', 'cash')
        """)

        result = pg_conn.execute("""
            SELECT amount_usd, net_amount_usd, fee_amount_usd
            FROM transactions
            WHERE transaction_id = 'txn_001'
        """).fetchone()

        assert result[0] == 100.0
        assert result[1] == 97.10
        assert result[2] == 2.90

    def test_daily_cash_position_view(self, pg_conn):
        """Test the daily cash position view."""
        pg_conn.execute("""
            INSERT INTO transactions
            (transaction_id, idempotency_key, occurred_at, posted_at, occurred_date, posted_date,
             type, status, source, amount, currency, fx_rate, net_amount, fee_amount, customer_id, basis)
            VALUES
            ('txn_001', 'idem_001', '2024-01-15', '2024-01-15', '2024-01-15', '2024-01-15',
             'charge', 'succeeded', 'stripe', 10000, 'USD', 1.0, 9710, 290, 'cus_001', 'cash'),
            ('txn_002', 'idem_002', '2024-01-15', '2024-01-15', '2024-01-15', '2024-01-15',
             'refund', 'succeeded', 'stripe', 2000, 'USD', 1.0, -2000, 0, 'cus_001', 'cash'),
            ('txn_003', 'idem_003', '2024-01-16', '2024-01-16', '2024-01-16', '2024-01-16',
             'charge', 'succeeded', 'stripe', 5000, 'USD', 1.0, 4855, 145, 'cus_002', 'cash')
        """)

        result = pg_conn.execute(
            "SELECT * FROM analytics.daily_cash_position ORDER BY date"
        ).fetchall()

        assert len(result) == 2
        assert result[0][1] == 97.10
        assert result[0][2] == 20.00
        assert result[0][3] == 77.10

    def test_indexes_exist(self, pg_conn):
        """Verify indexes exist in PostgreSQL catalog."""
        rows = pg_conn.execute(
            "SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'transactions'"
        ).fetchall()
        index_names = {r[0] for r in rows}
        assert "idx_transactions_occurred_date" in index_names
        assert "ux_transactions_id" in index_names


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
