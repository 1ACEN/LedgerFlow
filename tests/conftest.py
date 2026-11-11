"""
Shared pytest fixtures providing isolated temporary PostgreSQL databases for tests.
"""

from __future__ import annotations

import uuid
from collections.abc import Iterator

import psycopg
import pytest
from psycopg import sql
from psycopg.conninfo import conninfo_to_dict, make_conninfo

from scripts.db.connection import close_pools, normalize_database_url
from scripts.db.init_db import SCHEMA_SQL


def _with_dbname(base_url: str, dbname: str) -> str:
    params = conninfo_to_dict(base_url)
    params["dbname"] = dbname
    return make_conninfo(**params)


@pytest.fixture
def pg_test_url() -> Iterator[str]:
    """Provision an isolated PostgreSQL database with SCHEMA_SQL initialized, then drop it."""
    base_url = normalize_database_url()
    temp_db = f"ledgerflow_test_{uuid.uuid4().hex[:10]}"

    admin_conn = psycopg.connect(base_url, autocommit=True)
    try:
        admin_conn.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(temp_db)))
    finally:
        admin_conn.close()

    test_url = _with_dbname(base_url, temp_db)
    init_conn = psycopg.connect(test_url, autocommit=True)
    try:
        init_conn.execute(SCHEMA_SQL)
    finally:
        init_conn.close()

    try:
        yield test_url
    finally:
        close_pools()
        drop_conn = psycopg.connect(base_url, autocommit=True)
        try:
            drop_conn.execute(
                sql.SQL("DROP DATABASE IF EXISTS {} WITH (FORCE)").format(sql.Identifier(temp_db))
            )
        finally:
            drop_conn.close()


@pytest.fixture
def pg_conn(pg_test_url: str) -> Iterator[psycopg.Connection]:
    """Open an isolated autocommit connection to the temporary test PostgreSQL database."""
    conn = psycopg.connect(pg_test_url, autocommit=True)
    try:
        yield conn
    finally:
        conn.close()
