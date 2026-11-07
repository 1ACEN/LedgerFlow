"""
LedgerFlow Authentication & User Database Management

Provides secure password hashing (PBKDF2 HMAC SHA-256 with salt),
user registration, authentication against DuckDB, and seeding of initial credentials.
"""

from __future__ import annotations

import hashlib
import secrets
import uuid
from typing import Any


def hash_password(password: str, salt: str | None = None) -> tuple[str, str]:
    """Hash a password using PBKDF2-HMAC-SHA256 with 100,000 rounds and a random salt."""
    if not salt:
        salt = secrets.token_hex(16)
    hashed = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        100_000,
    ).hex()
    return hashed, salt


def verify_password(password: str, salt: str, expected_hash: str) -> bool:
    """Verify password against salt and expected hash in constant time."""
    hashed, _ = hash_password(password, salt)
    return secrets.compare_digest(hashed, expected_hash)


DEFAULT_USERS = [
    {
        "username": "admin",
        "password": "admin",
        "full_name": "Administrator",
        "role_id": "admin",
    },
    {
        "username": "executive",
        "password": "exec",
        "full_name": "Sarah Chen",
        "role_id": "executive",
    },
    {
        "username": "cfo",
        "password": "cfo",
        "full_name": "Marcus Vance",
        "role_id": "cfo",
    },
    {
        "username": "ops",
        "password": "ops",
        "full_name": "Elena Rostova",
        "role_id": "ops",
    },
    {
        "username": "credit",
        "password": "credit",
        "full_name": "David Sterling",
        "role_id": "credit",
    },
]


def init_users_table(conn: Any) -> None:
    """Ensure the users table exists and is seeded with initial default users if empty."""
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            user_id             VARCHAR PRIMARY KEY,
            username            VARCHAR UNIQUE NOT NULL,
            password_hash       VARCHAR NOT NULL,
            salt                VARCHAR NOT NULL,
            full_name           VARCHAR NOT NULL,
            role_id             VARCHAR NOT NULL,
            created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        """
    )

    # Check if empty
    count = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    if count == 0:
        for u in DEFAULT_USERS:
            pwd_hash, salt = hash_password(u["password"])
            user_id = f"usr_{uuid.uuid4().hex[:12]}"
            conn.execute(
                """
                INSERT INTO users (user_id, username, password_hash, salt, full_name, role_id)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                [user_id, u["username"].lower(), pwd_hash, salt, u["full_name"], u["role_id"]],
            )


def authenticate_user(conn: Any, username: str, password: str) -> dict[str, Any] | None:
    """Validate credentials against DuckDB users table."""
    clean_user = username.strip().lower()
    row = conn.execute(
        """
        SELECT user_id, username, password_hash, salt, full_name, role_id
        FROM users
        WHERE LOWER(username) = ?
        """,
        [clean_user],
    ).fetchone()

    if not row:
        return None

    user_id, db_user, expected_hash, salt, full_name, role_id = row
    if not verify_password(password, salt, expected_hash):
        return None

    return {
        "userId": user_id,
        "username": db_user,
        "displayName": full_name,
        "roleId": role_id,
    }


def register_user(
    conn: Any,
    username: str,
    password: str,
    full_name: str,
    role_id: str,
) -> tuple[dict[str, Any] | None, str | None]:
    """Register a new user in DuckDB. Returns (user_dict, error_message)."""
    clean_user = username.strip().lower()
    if not clean_user or len(clean_user) < 3:
        return None, "Username must be at least 3 characters long."

    if not password or len(password) < 4:
        return None, "Password must be at least 4 characters long."

    if not full_name.strip():
        return None, "Full name cannot be empty."

    valid_roles = {"admin", "executive", "cfo", "ops", "credit"}
    if role_id not in valid_roles:
        return None, f"Invalid role. Must be one of: {', '.join(sorted(valid_roles))}"

    # Check for existing username
    existing = conn.execute(
        "SELECT COUNT(*) FROM users WHERE LOWER(username) = ?",
        [clean_user],
    ).fetchone()[0]

    if existing > 0:
        return None, f"Username '{clean_user}' is already registered. Please sign in instead."

    pwd_hash, salt = hash_password(password)
    user_id = f"usr_{uuid.uuid4().hex[:12]}"

    conn.execute(
        """
        INSERT INTO users (user_id, username, password_hash, salt, full_name, role_id)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        [user_id, clean_user, pwd_hash, salt, full_name.strip(), role_id],
    )

    return (
        {
            "userId": user_id,
            "username": clean_user,
            "displayName": full_name.strip(),
            "roleId": role_id,
        },
        None,
    )
