#!/usr/bin/env python3
"""
Unit tests for LedgerFlow authentication endpoints and DuckDB user database.
"""

import duckdb
import pytest
from fastapi.testclient import TestClient

from scripts.api.auth_db import (
    authenticate_user,
    hash_password,
    init_users_table,
    register_user,
    verify_password,
)
from scripts.api.webhooks import app


class TestAuthDB:
    """Test DuckDB user management and PBKDF2 hashing."""

    def test_password_hashing_and_verification(self):
        pwd = "secure_password_123"
        pwd_hash, salt = hash_password(pwd)
        assert pwd_hash is not None
        assert salt is not None
        assert len(salt) == 32  # 16 bytes hex

        assert verify_password(pwd, salt, pwd_hash) is True
        assert verify_password("wrong_password", salt, pwd_hash) is False

    def test_init_users_table_and_defaults(self):
        conn = duckdb.connect(":memory:")
        init_users_table(conn)

        count = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        assert count == 5  # admin, executive, cfo, ops, credit

        admin = authenticate_user(conn, "admin", "admin")
        assert admin is not None
        assert admin["username"] == "admin"
        assert admin["roleId"] == "admin"

        cfo = authenticate_user(conn, "cfo", "cfo")
        assert cfo is not None
        assert cfo["username"] == "cfo"
        assert cfo["roleId"] == "cfo"

        wrong = authenticate_user(conn, "admin", "wrongpassword")
        assert wrong is None

    def test_register_new_user(self):
        conn = duckdb.connect(":memory:")
        init_users_table(conn)

        user, err = register_user(
            conn,
            username="alex_analyst",
            password="mypassword123",
            full_name="Alex River",
            role_id="credit",
        )
        assert err is None
        assert user is not None
        assert user["username"] == "alex_analyst"
        assert user["roleId"] == "credit"
        assert user["displayName"] == "Alex River"

        # Verify authentication works for the newly registered user
        auth_res = authenticate_user(conn, "alex_analyst", "mypassword123")
        assert auth_res is not None
        assert auth_res["username"] == "alex_analyst"

        # Duplicate username should fail
        dup_user, dup_err = register_user(
            conn,
            username="alex_analyst",
            password="anotherpassword",
            full_name="Alex Duplicate",
            role_id="ops",
        )
        assert dup_user is None
        assert "already registered" in dup_err.lower()


class TestAuthAPIEndpoints:
    """Test FastAPI authentication endpoints."""

    @pytest.fixture(autouse=True)
    def setup_client(self):
        self.client = TestClient(app)

    def test_api_roles_endpoint(self):
        res = self.client.get("/api/auth/roles")
        assert res.status_code == 200
        roles = res.json()["roles"]
        assert len(roles) == 5
        role_ids = [r["id"] for r in roles]
        assert "admin" in role_ids
        assert "executive" in role_ids
        assert "cfo" in role_ids

    def test_api_login_success(self):
        res = self.client.post("/api/auth/login", json={"username": "admin", "password": "admin"})
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "success"
        assert data["user"]["username"] == "admin"
        assert data["user"]["roleId"] == "admin"

    def test_api_login_invalid_password(self):
        res = self.client.post("/api/auth/login", json={"username": "admin", "password": "invalid"})
        assert res.status_code == 401

    def test_api_login_unknown_user(self):
        res = self.client.post(
            "/api/auth/login", json={"username": "nonexistent_user", "password": "any"}
        )
        assert res.status_code == 401

    def test_api_signup_flow(self):
        import uuid

        unique_name = f"user_{uuid.uuid4().hex[:6]}"
        res = self.client.post(
            "/api/auth/signup",
            json={
                "username": unique_name,
                "password": "valid_password",
                "full_name": "Test User",
                "role_id": "ops",
            },
        )
        assert res.status_code == 201
        data = res.json()
        assert data["status"] == "success"
        assert data["user"]["username"] == unique_name

        # Now login with the newly signed up user
        login_res = self.client.post(
            "/api/auth/login",
            json={"username": unique_name, "password": "valid_password"},
        )
        assert login_res.status_code == 200
        assert login_res.json()["user"]["username"] == unique_name
