#!/usr/bin/env python3
"""
LedgerFlow: Decline Retry Advisor Model Training

Trains an XGBoost classifier to predict whether a declined transaction
will succeed on retry within 7 days, and recommends optimal retry timing.

Usage:
    python scripts/train_retry.py --db data/ledgerflow.duckdb --output models/decline_retry.joblib
"""

import argparse
from datetime import datetime, timedelta
from pathlib import Path

import duckdb
import polars as pl
import xgboost as xgb
from joblib import dump
from rich.console import Console
from sklearn.metrics import average_precision_score, classification_report, roc_auc_score

console = Console()

# =============================================================================
# FEATURE ENGINEERING
# =============================================================================

DECLINE_CODE_ORDER = [
    "insufficient_funds",
    "card_declined",
    "expired_card",
    "incorrect_cvc",
    "processing_error",
    "call_issuer",
    "pickup_card",
    "restricted_card",
    "lost_card",
    "stolen_card",
    "suspected_fraud",
    "velocity_exceeded",
    "do_not_honor",
    "generic_decline",
    "authentication_required",
]

CARD_BRAND_ORDER = ["Visa", "Mastercard", "American Express", "Discover", "JCB"]
CARD_FUNDING_ORDER = ["credit", "debit", "prepaid"]
RECOMMENDED_ACTIONS = ["retry_1h", "retry_24h", "retry_72h", "do_not_retry"]


def prepare_features(conn: duckdb.DuckDBPyConnection) -> tuple:
    """Build training dataset from historical declines and their retry outcomes."""

    console.log("Loading decline events with retry outcomes...")

    # Get all declined transactions with their retry history
    query = """
        WITH declined AS (
            SELECT
                t.transaction_id,
                t.decline_code,
                COALESCE(json_extract_string(t.metadata_json, '$.card_brand'), 'Visa') AS card_brand,
                COALESCE(json_extract_string(t.metadata_json, '$.card_funding'), 'credit') AS card_funding,
                t.amount_usd,
                EXTRACT(HOUR FROM t.occurred_at)::INT AS occurred_hour,
                t.customer_id,
                t.occurred_at
            FROM transactions t
            WHERE t.status = 'failed'
              AND t.decline_code IS NOT NULL
              AND t.type IN ('charge', 'invoice_payment')
              AND t.occurred_at >= CURRENT_DATE - INTERVAL '180 days'
        ),
        retries AS (
            SELECT
                d.transaction_id AS original_txn_id,
                MAX(CASE WHEN r.status = 'succeeded' THEN 1 ELSE 0 END) AS succeeded_on_retry,
                MIN(CASE WHEN r.status = 'succeeded' THEN r.occurred_at END) AS first_success_at,
                COUNT(*) FILTER (WHERE r.status = 'succeeded') AS n_successful_retries,
                COUNT(*) FILTER (WHERE r.status = 'failed') AS n_failed_retries
            FROM declined d
            LEFT JOIN transactions r
                ON r.customer_id = d.customer_id
               AND r.type IN ('charge', 'invoice_payment')
               AND r.occurred_at > d.occurred_at
               AND r.occurred_at <= d.occurred_at + INTERVAL '7 days'
            GROUP BY d.transaction_id
        ),
        customer_history AS (
            SELECT
                customer_id,
                COUNT(*) FILTER (WHERE status = 'failed' AND decline_code IS NOT NULL) AS total_declines_30d,
                COUNT(*) FILTER (WHERE status = 'succeeded' AND type IN ('charge', 'invoice_payment')) AS total_successes_30d,
                AVG(amount_usd) FILTER (WHERE status = 'failed') AS avg_decline_amount_30d
            FROM transactions
            WHERE occurred_at >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY customer_id
        )
        SELECT
            d.*,
            COALESCE(r.succeeded_on_retry, 0) AS target,
            r.first_success_at,
            r.n_successful_retries,
            r.n_failed_retries,
            COALESCE(ch.total_declines_30d, 0) AS cust_declines_30d,
            COALESCE(ch.total_successes_30d, 0) AS cust_successes_30d,
            COALESCE(ch.avg_decline_amount_30d, 0) AS cust_avg_decline_amt_30d
        FROM declined d
        LEFT JOIN retries r ON d.transaction_id = r.original_txn_id
        LEFT JOIN customer_history ch ON d.customer_id = ch.customer_id
        ORDER BY d.occurred_at
    """

    df = conn.execute(query).pl()
    console.log(f"Loaded {len(df)} decline events")

    if len(df) < 100:
        raise ValueError(f"Need at least 100 decline events, got {len(df)}")

    # Feature engineering
    df = df.with_columns(
        [
            # Decline code encoding (ordinal based on retry success rates)
            pl.col("decline_code").cast(pl.Categorical).to_physical().alias("decline_code_enc"),
            # Card features
            pl.col("card_brand").cast(pl.Categorical).to_physical().alias("card_brand_enc"),
            pl.col("card_funding").cast(pl.Categorical).to_physical().alias("card_funding_enc"),
            # Amount features
            pl.col("amount_usd").log1p().alias("log_amount_usd"),
            (pl.col("amount_usd") > pl.col("amount_usd").quantile(0.9))
            .cast(pl.Int32)
            .alias("is_high_amount"),
            # Time features
            pl.col("occurred_hour").alias("hour"),
            (pl.col("occurred_hour").is_between(22, 6)).cast(pl.Int32).alias("is_night"),
            (pl.col("occurred_hour").is_between(9, 17)).cast(pl.Int32).alias("is_business_hours"),
            # Customer history features
            (pl.col("cust_declines_30d") > 0).cast(pl.Int32).alias("has_recent_declines"),
            (
                pl.col("cust_successes_30d")
                / (pl.col("cust_declines_30d") + pl.col("cust_successes_30d") + 1)
            ).alias("cust_success_rate_30d"),
            pl.col("cust_avg_decline_amt_30d").log1p().alias("cust_log_avg_decline_amt"),
            # Retry history (for future: would need separate retry attempts table)
            # For now, use customer-level proxy
            (pl.col("cust_declines_30d") > 3).cast(pl.Int32).alias("cust_high_decline_velocity"),
        ]
    )

    # Build customer retry history JSON (for inference time)
    retry_history = (
        df.group_by("customer_id")
        .agg(
            [
                pl.col("target").sum().alias("total_retries_succeeded"),
                pl.col("target").count().alias("total_retries_attempted"),
            ]
        )
        .with_columns(
            [
                (pl.col("total_retries_succeeded") / pl.col("total_retries_attempted")).alias(
                    "customer_retry_success_rate"
                )
            ]
        )
    )

    # Merge retry history
    df = df.join(
        retry_history.select(["customer_id", "customer_retry_success_rate"]),
        on="customer_id",
        how="left",
    )
    df = df.with_columns(pl.col("customer_retry_success_rate").fill_null(0))

    # Target: succeeded on retry within 7 days
    y = df["target"].to_numpy()

    # Feature columns
    feature_cols = [
        "decline_code_enc",
        "card_brand_enc",
        "card_funding_enc",
        "log_amount_usd",
        "is_high_amount",
        "hour",
        "is_night",
        "is_business_hours",
        "cust_declines_30d",
        "cust_successes_30d",
        "cust_log_avg_decline_amt",
        "cust_success_rate_30d",
        "cust_high_decline_velocity",
        "customer_retry_success_rate",
    ]

    X = df.select(feature_cols).to_numpy()

    # Time-based split (last 30 days for validation)
    split_idx = int(len(df) * 0.8)
    X_train, X_val = X[:split_idx], X[split_idx:]
    y_train, y_val = y[:split_idx], y[split_idx:]

    console.log(f"Train: {len(X_train)}, Val: {len(X_val)}")
    console.log(f"Positive rate (train): {y_train.mean():.2%}, (val): {y_val.mean():.2%}")

    return X_train, y_train, X_val, y_val, feature_cols, df[split_idx:]


# =============================================================================
# MODEL TRAINING
# =============================================================================


def train_model(X_train, y_train, X_val, y_val, feature_cols: list) -> xgb.Booster:
    """Train XGBoost binary classifier."""

    dtrain = xgb.DMatrix(X_train, label=y_train, feature_names=feature_cols)
    dval = xgb.DMatrix(X_val, label=y_val, feature_names=feature_cols)

    params = {
        "objective": "binary:logistic",
        "eval_metric": ["auc", "aucpr", "logloss"],
        "eta": 0.05,
        "max_depth": 6,
        "min_child_weight": 10,
        "subsample": 0.8,
        "colsample_bytree": 0.8,
        "reg_alpha": 0.1,
        "reg_lambda": 1.0,
        "scale_pos_weight": (y_train == 0).sum() / max((y_train == 1).sum(), 1),
        "random_state": 42,
        "n_jobs": -1,
        "verbosity": 0,
    }

    model = xgb.train(
        params,
        dtrain,
        num_boost_round=1000,
        evals=[(dtrain, "train"), (dval, "val")],
        early_stopping_rounds=50,
        verbose_eval=False,
    )

    return model


def evaluate_model(model: xgb.Booster, X_val, y_val, feature_cols: list) -> dict:
    """Evaluate classifier."""
    dval = xgb.DMatrix(X_val, feature_names=feature_cols)
    probas = model.predict(dval, iteration_range=(0, model.best_iteration + 1))
    preds = (probas >= 0.5).astype(int)

    return {
        "roc_auc": float(roc_auc_score(y_val, probas)),
        "pr_auc": float(average_precision_score(y_val, probas)),
        "classification_report": classification_report(y_val, preds, output_dict=True),
    }


def map_to_action(proba: float, amount_usd: float) -> tuple[str, str]:
    """Map predicted probability to recommended action."""
    if proba >= 0.7:
        return "retry_1h", "High confidence - retry within 1 hour"
    if proba >= 0.4:
        return "retry_24h", "Moderate confidence - retry within 24 hours"
    if proba >= 0.2:
        return "retry_72h", "Low confidence - retry within 72 hours"
    return "do_not_retry", "Very low confidence - do not retry (contact customer)"


def main():
    parser = argparse.ArgumentParser(description="Train decline retry advisor model")
    parser.add_argument("--db", type=Path, default=Path("data/ledgerflow.duckdb"))
    parser.add_argument("--output", type=Path, default=Path("models/decline_retry.joblib"))
    args = parser.parse_args()

    args.output.parent.mkdir(parents=True, exist_ok=True)

    console.rule("[bold blue]LedgerFlow Decline Retry Advisor Training[/bold blue]")

    conn = duckdb.connect(str(args.db))

    # Prepare features
    X_train, y_train, X_val, y_val, feature_cols, val_df = prepare_features(conn)

    # Train
    console.log("Training XGBoost classifier...")
    model = train_model(X_train, y_train, X_val, y_val, feature_cols)

    # Evaluate
    metrics = evaluate_model(model, X_val, y_val, feature_cols)
    console.log("\n[bold]Validation Metrics:[/bold]")
    console.log(f"  ROC-AUC: {metrics['roc_auc']:.4f}")
    console.log(f"  PR-AUC:  {metrics['pr_auc']:.4f}")
    console.log(f"  Precision@0.5: {metrics['classification_report']['1']['precision']:.4f}")
    console.log(f"  Recall@0.5:    {metrics['classification_report']['1']['recall']:.4f}")

    # Feature importance
    importance = model.get_score(importance_type="gain")
    top_features = sorted(importance.items(), key=lambda x: x[1], reverse=True)[:15]
    console.log("\n[bold]Top 15 Features:[/bold]")
    for feat, imp in top_features:
        console.log(f"  {feat}: {imp:.1f}")

    # Save model bundle
    model_bundle = {
        "model": model,
        "feature_columns": feature_cols,
        "decline_code_mapping": {code: i for i, code in enumerate(DECLINE_CODE_ORDER)},
        "card_brand_mapping": {brand: i for i, brand in enumerate(CARD_BRAND_ORDER)},
        "card_funding_mapping": {funding: i for i, funding in enumerate(CARD_FUNDING_ORDER)},
        "metrics": metrics,
        "trained_at": datetime.utcnow().isoformat(),
        "version": f"v{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
        "thresholds": {"high": 0.7, "medium": 0.4, "low": 0.2},
    }

    dump(model_bundle, args.output)
    console.log(f"\n[green][OK][/green] Model saved to {args.output}")

    # Write decline predictions to ml.decline_predictions
    try:
        import xgboost as xgb

        dval = xgb.DMatrix(val_df.select(feature_cols).to_pandas())
        probs = model.predict(dval)

        pred_rows = []
        now_ts = datetime.utcnow()
        for idx, row in enumerate(val_df.iter_rows(named=True)):
            prob = float(probs[idx])
            if prob >= 0.7:
                action = "retry_1h"
                retry_at = now_ts + timedelta(hours=1)
            elif prob >= 0.4:
                action = "retry_24h"
                retry_at = now_ts + timedelta(hours=24)
            elif prob >= 0.2:
                action = "retry_72h"
                retry_at = now_ts + timedelta(hours=72)
            else:
                action = "do_not_retry"
                retry_at = None

            pred_rows.append(
                {
                    "transaction_id": row["transaction_id"],
                    "decline_code": row.get("decline_code"),
                    "card_brand": row.get("card_brand"),
                    "card_funding": row.get("card_funding"),
                    "amount_usd": float(row.get("amount_usd") or 0.0),
                    "occurred_hour": int(row.get("occurred_hour") or 0),
                    "customer_id": row.get("customer_id"),
                    "customer_retry_history": "{}",
                    "retry_success_probability": round(prob, 4),
                    "recommended_action": action,
                    "recommended_retry_at": retry_at,
                    "expected_recovery_usd": round(prob * float(row.get("amount_usd") or 0.0), 2),
                    "model_version": model_bundle["version"],
                    "scored_at": now_ts,
                }
            )

        pred_df = pl.DataFrame(pred_rows)
        conn.register("pred_staging", pred_df)
        conn.execute("CREATE SCHEMA IF NOT EXISTS ml;")
        conn.execute("""
            CREATE TABLE IF NOT EXISTS ml.decline_predictions (
                transaction_id              VARCHAR PRIMARY KEY,
                decline_code                VARCHAR,
                card_brand                  VARCHAR,
                card_funding                VARCHAR,
                amount_usd                  DOUBLE,
                occurred_hour               SMALLINT,
                customer_id                 VARCHAR,
                customer_retry_history      JSON,
                retry_success_probability   DOUBLE,
                recommended_action          VARCHAR,
                recommended_retry_at        TIMESTAMP WITH TIME ZONE,
                expected_recovery_usd       DOUBLE,
                model_version               VARCHAR,
                scored_at                   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        """)
        conn.execute("INSERT OR REPLACE INTO ml.decline_predictions SELECT * FROM pred_staging")
        console.log(
            f"[green][OK][/green] Scored and wrote {len(pred_rows)} predictions to ml.decline_predictions"
        )
    except Exception as e:
        console.log(f"[yellow]Warning: Could not write decline predictions: {e}[/yellow]")

    conn.close()
    console.rule("[bold green]Training complete![/bold green]")


if __name__ == "__main__":
    main()
