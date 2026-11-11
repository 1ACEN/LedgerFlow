"""
LedgerFlow: PostgreSQL Connection Pool & DataFrame Helpers

Manages thread-safe psycopg v3 connection pooling backed by DATABASE_URL,
Polars DataFrame extraction, and high-throughput COPY upserts.
"""

from __future__ import annotations

import os
import threading
import uuid
from collections.abc import Iterator
from contextlib import contextmanager
from decimal import Decimal
from typing import Any

import polars as pl
import psycopg
from dotenv import load_dotenv
from psycopg_pool import ConnectionPool

load_dotenv()

_pool_lock = threading.Lock()
_pools: dict[str, ConnectionPool] = {}


def normalize_database_url(db_url: str | None = None) -> str:
    """Resolve and normalize the PostgreSQL connection string from argument or environment."""
    raw = db_url or os.getenv("DATABASE_URL") or ""
    raw = raw.strip()
    if not raw:
        raise RuntimeError(
            "DATABASE_URL is not configured. Set DATABASE_URL in .env or environment "
            "(e.g. postgresql://ledgerflow:ledgerflow@localhost:5433/ledgerflow)."
        )
    if raw.startswith("postgres://"):
        raw = "postgresql://" + raw[len("postgres://") :]
    return raw


def get_pool(db_url: str | None = None) -> ConnectionPool:
    """Return a cached thread-safe psycopg ConnectionPool for the target database."""
    url = normalize_database_url(db_url)
    with _pool_lock:
        pool = _pools.get(url)
        if pool is None or pool.closed:
            pool = ConnectionPool(
                conninfo=url,
                min_size=1,
                max_size=10,
                max_lifetime=300,
                check=ConnectionPool.check_connection,
                kwargs={"autocommit": True},
                open=True,
            )
            _pools[url] = pool
        return pool


@contextmanager
def get_conn(db_url: str | None = None) -> Iterator[psycopg.Connection]:
    """Borrow a pooled PostgreSQL connection and return it automatically."""
    pool = get_pool(db_url)
    with pool.connection() as conn:
        yield conn


def open_direct_conn(db_url: str | None = None) -> psycopg.Connection:
    """Open a standalone autocommit connection for short-lived CLI scripts."""
    url = normalize_database_url(db_url)
    return psycopg.connect(url, autocommit=True)


def close_pools() -> None:
    """Close all open connection pools cleanly."""
    with _pool_lock:
        for pool in _pools.values():
            if not pool.closed:
                pool.close()
        _pools.clear()


def _coerce_pg_value(val: Any) -> Any:
    """Convert PostgreSQL Decimal scalars into float so analytics and ML code stay consistent."""
    if isinstance(val, Decimal):
        return float(val)
    return val


def read_polars(
    conn: psycopg.Connection,
    query: str,
    params: tuple[Any, ...] | list[Any] | None = None,
) -> pl.DataFrame:
    """Execute a SQL query on PostgreSQL and return a clean Polars DataFrame."""
    with conn.cursor() as cur:
        cur.execute(query, params)
        if not cur.description:
            return pl.DataFrame()
        col_names = [desc.name for desc in cur.description]
        raw_rows = cur.fetchall()

    if not raw_rows:
        return pl.DataFrame(schema=dict.fromkeys(col_names, pl.Null))

    columns: dict[str, list[Any]] = {name: [] for name in col_names}
    for row in raw_rows:
        for idx, name in enumerate(col_names):
            columns[name].append(_coerce_pg_value(row[idx]))

    return pl.DataFrame(columns, strict=False)


def copy_upsert_dataframe(
    conn: psycopg.Connection,
    table: str,
    df: pl.DataFrame,
    conflict_cols: list[str],
    update_cols: list[str] | None = None,
    *,
    do_nothing: bool = False,
) -> None:
    """
    Bulk-load a Polars DataFrame into PostgreSQL via TEMP TABLE + COPY FROM STDIN,
    then merge into the target table with ON CONFLICT.
    """
    if df.is_empty():
        return

    cols = list(df.columns)
    col_list = ", ".join(cols)
    staging = f"_stg_{uuid.uuid4().hex[:12]}"
    conflict_expr = ", ".join(conflict_cols)

    if do_nothing:
        conflict_clause = f"ON CONFLICT ({conflict_expr}) DO NOTHING"
    else:
        cols_to_update = update_cols or [c for c in cols if c not in conflict_cols]
        if cols_to_update:
            assignments = ", ".join(f"{c} = EXCLUDED.{c}" for c in cols_to_update)
            conflict_clause = f"ON CONFLICT ({conflict_expr}) DO UPDATE SET {assignments}"
        else:
            conflict_clause = f"ON CONFLICT ({conflict_expr}) DO NOTHING"

    with conn.transaction():
        conn.execute(
            f"CREATE TEMP TABLE {staging} ON COMMIT DROP AS SELECT {col_list} FROM {table} LIMIT 0"
        )
        with (
            conn.cursor() as cur,
            cur.copy(f"COPY {staging} ({col_list}) FROM STDIN") as copy,
        ):
            for row in df.iter_rows():
                copy.write_row(row)

        conn.execute(
            f"INSERT INTO {table} ({col_list}) SELECT {col_list} FROM {staging} {conflict_clause}"
        )
