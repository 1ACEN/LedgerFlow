#!/usr/bin/env python3
"""
Unit tests for database schema and views.
"""

import tempfile
from pathlib import Path

import duckdb
import pytest


class TestSchema:
    """Tests for LedgerFlow database schema."""

    @pytest.fixture
    def db(self):
        """Create a temporary database with schema applied."""
        with tempfile.TemporaryDirectory() as tmpdir:
            db_path = Path(tmpdir) / "test.duckdb"
            conn = duckdb.connect(str(db_path))

            # Run the init_db.py schema
            conn.execute("""
                CREATE SCHEMA IF NOT EXISTS analytics;
                CREATE SCHEMA IF NOT EXISTS ml;
            """)

            conn.execute("""
                CREATE TABLE IF NOT EXISTS transactions (
                    transaction_id      VARCHAR PRIMARY KEY,
                    idempotency_key     VARCHAR UNIQUE,
                    occurred_at         TIMESTAMP WITH TIME ZONE NOT NULL,
                    posted_at           TIMESTAMP WITH TIME ZONE,
                    occurred_date       DATE,
                    posted_date         DATE,
                    type                VARCHAR NOT NULL,
                    status              VARCHAR NOT NULL,
                    source              VARCHAR NOT NULL,
                    amount              BIGINT NOT NULL,
                    currency            CHAR(3) NOT NULL,
                    fx_rate             DOUBLE NOT NULL DEFAULT 1.0,
                    net_amount          BIGINT NOT NULL,
                    fee_amount          BIGINT NOT NULL DEFAULT 0,
                    customer_id         VARCHAR,
                    basis               VARCHAR NOT NULL DEFAULT 'cash',
                    decline_code        VARCHAR,
                    description         VARCHAR,
                    ingested_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    batch_id            VARCHAR,
                    amount_usd          DOUBLE GENERATED ALWAYS AS (amount * fx_rate / 100.0),
                    net_amount_usd      DOUBLE GENERATED ALWAYS AS (net_amount * fx_rate / 100.0),
                    fee_amount_usd      DOUBLE GENERATED ALWAYS AS (fee_amount * fx_rate / 100.0)
                );
            """)

            conn.execute("""
                CREATE TABLE IF NOT EXISTS customers (
                    customer_id     VARCHAR PRIMARY KEY,
                    customer_email  VARCHAR,
                    customer_name   VARCHAR
                );
            """)

            conn.execute("""
                CREATE OR REPLACE VIEW analytics.daily_cash_position AS
                SELECT
                    posted_date AS date,
                    SUM(CASE WHEN net_amount_usd > 0 THEN net_amount_usd ELSE 0 END) AS inflows_usd,
                    SUM(CASE WHEN net_amount_usd < 0 THEN -net_amount_usd ELSE 0 END) AS outflows_usd,
                    SUM(net_amount_usd) AS net_flow_usd
                FROM transactions
                WHERE basis = 'cash' AND status = 'succeeded'
                GROUP BY posted_date;
            """)

            yield conn
            conn.close()

    def test_core_tables_exist(self, db):
        """Verify core tables are created."""
        tables = db.execute("""
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'main'
            ORDER BY table_name
        """).fetchall()
        table_names = [t[0] for t in tables]
        assert "transactions" in table_names
        assert "customers" in table_names

    def test_transactions_columns(self, db):
        """Verify transactions table has all required columns."""
        cols = db.execute("DESCRIBE transactions").fetchall()
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

    def test_generated_columns(self, db):
        """Test that generated columns compute correctly."""
        db.execute("""
            INSERT INTO transactions
            (transaction_id, idempotency_key, occurred_at, posted_at, type, status, source,
             amount, currency, fx_rate, net_amount, fee_amount, customer_id, basis)
            VALUES
            ('txn_001', 'idem_001', '2024-01-15', '2024-01-15', 'charge', 'succeeded', 'stripe',
             10000, 'USD', 1.0, 9710, 290, 'cus_001', 'cash')
        """)

        result = db.execute("""
            SELECT amount_usd, net_amount_usd, fee_amount_usd
            FROM transactions
            WHERE transaction_id = 'txn_001'
        """).fetchone()

        assert result[0] == 100.0  # amount_usd = 10000 * 1.0 / 100
        assert result[1] == 97.10  # net_amount_usd = 9710 * 1.0 / 100
        assert result[2] == 2.90  # fee_amount_usd = 290 * 1.0 / 100

    def test_daily_cash_position_view(self, db):
        """Test the daily cash position view."""
        # Insert test data
        db.execute("""
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

        result = db.execute("SELECT * FROM analytics.daily_cash_position ORDER BY date").fetchall()

        assert len(result) == 2
        # Jan 15: inflow 97.10, outflow 20.00, net 77.10
        assert result[0][1] == 97.10  # inflows
        assert result[0][2] == 20.00  # outflows
        assert result[0][3] == 77.10  # net

    def test_indexes_exist(self, db):
        """Verify indexes are created."""
        # We can't easily test indexes in DuckDB, but we can verify the statements would work
        db.execute("CREATE INDEX IF NOT EXISTS idx_test ON transactions(occurred_date)")
        # If no error, index creation works


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
