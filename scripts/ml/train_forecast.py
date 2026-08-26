#!/usr/bin/env python3
"""
LedgerFlow: Cash Flow Forecast Model Training

Trains a LightGBM quantile regression model to predict daily net cash flow
with prediction intervals (P10, P50, P90).

Usage:
    python scripts/train_forecast.py --db data/ledgerflow.duckdb --output models/cash_forecast.joblib
"""

import argparse
from datetime import datetime
from pathlib import Path

import duckdb
import lightgbm as lgb
import polars as pl
from joblib import dump
from rich.console import Console
from sklearn.metrics import mean_absolute_error, mean_pinball_loss

console = Console()

# =============================================================================
# FEATURE ENGINEERING
# =============================================================================


def prepare_features(
    conn: duckdb.DuckDBPyConnection, lookback_days: int = 365
) -> tuple[pl.DataFrame, pl.DataFrame]:
    """Extract and engineer features for cash flow forecasting."""

    console.log("Loading transaction data...")
    query = f"""
        SELECT
            posted_date,
            SUM(CASE WHEN net_amount_usd > 0 THEN net_amount_usd ELSE 0 END) AS inflows_usd,
            SUM(CASE WHEN net_amount_usd < 0 THEN -net_amount_usd ELSE 0 END) AS outflows_usd,
            SUM(net_amount_usd) AS net_flow_usd,
            COUNT(*) FILTER (WHERE type IN ('charge', 'invoice_payment') AND status = 'succeeded') AS n_charges,
            COUNT(*) FILTER (WHERE type = 'refund' AND status = 'succeeded') AS n_refunds,
            COUNT(*) FILTER (WHERE type = 'payout' AND status = 'succeeded') AS n_payouts,
            COALESCE(SUM(amount_usd) FILTER (WHERE type IN ('charge', 'invoice_payment') AND status = 'succeeded'), 0.0) AS gross_revenue_usd,
            COALESCE(SUM(amount_usd) FILTER (WHERE type = 'refund' AND status = 'succeeded'), 0.0) AS refunds_usd
        FROM transactions
        WHERE basis = 'cash'
          AND status = 'succeeded'
          AND posted_date >= CURRENT_DATE - INTERVAL '{lookback_days} days'
        GROUP BY posted_date
        ORDER BY posted_date
    """
    daily = conn.execute(query).pl()

    if len(daily) < 60:
        raise ValueError(f"Need at least 60 days of data, got {len(daily)}")

    console.log(f"Loaded {len(daily)} days of cash flow data")

    # Feature engineering
    df = daily.with_columns(
        [
            # Calendar features
            pl.col("posted_date").dt.weekday().alias("dow"),  # 1=Monday
            pl.col("posted_date").dt.day().alias("day_of_month"),
            pl.col("posted_date").dt.month().alias("month"),
            pl.col("posted_date").dt.quarter().alias("quarter"),
            pl.col("posted_date").dt.year().alias("year"),
            (pl.col("posted_date").dt.weekday() >= 6).cast(pl.Int32).alias("is_weekend"),
            (pl.col("posted_date").dt.day() <= 5).cast(pl.Int32).alias("is_month_start"),
            (pl.col("posted_date").dt.day() >= 25).cast(pl.Int32).alias("is_month_end"),
            # Lag features (1, 2, 3, 7, 14, 30 days)
            *[
                pl.col("net_flow_usd").shift(i).alias(f"net_flow_lag_{i}d")
                for i in [1, 2, 3, 7, 14, 30]
            ],
            *[pl.col("inflows_usd").shift(i).alias(f"inflows_lag_{i}d") for i in [1, 7, 30]],
            *[pl.col("outflows_usd").shift(i).alias(f"outflows_lag_{i}d") for i in [1, 7, 30]],
            # Rolling statistics (7, 30 day windows)
            pl.col("net_flow_usd").rolling_mean(7).alias("net_flow_ma_7d"),
            pl.col("net_flow_usd").rolling_std(7).alias("net_flow_std_7d"),
            pl.col("net_flow_usd").rolling_mean(30).alias("net_flow_ma_30d"),
            pl.col("net_flow_usd").rolling_std(30).alias("net_flow_std_30d"),
            pl.col("inflows_usd").rolling_mean(7).alias("inflows_ma_7d"),
            pl.col("outflows_usd").rolling_mean(7).alias("outflows_ma_7d"),
            # Cumulative cash position (runway proxy)
            pl.col("net_flow_usd").cum_sum().alias("cumulative_cash_usd"),
            # Trend features
            (pl.col("net_flow_usd") - pl.col("net_flow_usd").shift(7)).alias("net_flow_wow_change"),
            (pl.col("net_flow_usd") - pl.col("net_flow_usd").shift(30)).alias(
                "net_flow_mom_change"
            ),
        ]
    )

    # Target: next day's net flow (we'll predict multiple horizons later)
    df = df.with_columns(
        [
            pl.col("net_flow_usd").shift(-1).alias("target_net_flow_1d"),
            pl.col("net_flow_usd").shift(-7).alias("target_net_flow_7d"),
        ]
    )

    # Drop rows with NaN (from lags/rolling)
    df = df.drop_nulls()

    console.log(f"Feature matrix: {df.shape[0]} rows, {df.shape[1]} columns")

    # Split: last 30 days for validation
    split_idx = len(df) - 30
    train_df = df[:split_idx]
    val_df = df[split_idx:]

    feature_cols = [
        c
        for c in df.columns
        if c
        not in [
            "posted_date",
            "target_net_flow_1d",
            "target_net_flow_7d",
            "inflows_usd",
            "outflows_usd",
            "net_flow_usd",  # Current day (target)
            "cumulative_cash_usd",  # Leakage
        ]
    ]

    X_train = train_df.select(feature_cols).to_numpy()
    y_train = train_df["target_net_flow_1d"].to_numpy()
    X_val = val_df.select(feature_cols).to_numpy()
    y_val = val_df["target_net_flow_1d"].to_numpy()

    return (X_train, y_train, X_val, y_val, feature_cols, val_df)


# =============================================================================
# MODEL TRAINING
# =============================================================================


def train_quantile_model(
    X_train, y_train, X_val, y_val, alpha: float, feature_cols: list
) -> lgb.Booster:
    """Train LightGBM quantile regression for a given quantile."""

    params = {
        "objective": "quantile",
        "alpha": alpha,
        "metric": "quantile",
        "boosting_type": "gbdt",
        "num_leaves": 63,
        "learning_rate": 0.05,
        "feature_fraction": 0.8,
        "bagging_fraction": 0.8,
        "bagging_freq": 5,
        "min_child_samples": 20,
        "reg_alpha": 0.1,
        "reg_lambda": 0.1,
        "n_estimators": 2000,
        "early_stopping_rounds": 100,
        "verbose": -1,
        "random_state": 42,
        "n_jobs": -1,
    }

    train_data = lgb.Dataset(X_train, label=y_train, feature_name=feature_cols)
    val_data = lgb.Dataset(X_val, label=y_val, feature_name=feature_cols, reference=train_data)

    model = lgb.train(
        params,
        train_data,
        valid_sets=[train_data, val_data],
        valid_names=["train", "val"],
        callbacks=[lgb.early_stopping(100), lgb.log_evaluation(0)],
    )

    return model


def evaluate_model(model: lgb.Booster, X_val, y_val, alpha: float) -> dict:
    """Evaluate quantile model."""
    preds = model.predict(X_val, num_iteration=model.best_iteration)
    mae = mean_absolute_error(y_val, preds)
    pinball = mean_pinball_loss(y_val, preds, alpha=alpha)
    return {"mae": float(mae), "pinball_loss": float(pinball)}


def main():
    parser = argparse.ArgumentParser(description="Train cash flow forecast model")
    parser.add_argument("--db", type=Path, default=Path("data/ledgerflow.duckdb"))
    parser.add_argument("--output", type=Path, default=Path("models/cash_forecast.joblib"))
    parser.add_argument("--lookback-days", type=int, default=365)
    args = parser.parse_args()

    args.output.parent.mkdir(parents=True, exist_ok=True)

    console.rule("[bold blue]LedgerFlow Cash Flow Forecast Training[/bold blue]")

    conn = duckdb.connect(str(args.db), read_only=True)

    # Prepare features
    X_train, y_train, X_val, y_val, feature_cols, val_df = prepare_features(
        conn, args.lookback_days
    )

    # Train three quantile models
    console.log("Training P10 model (lower bound)...")
    model_p10 = train_quantile_model(
        X_train, y_train, X_val, y_val, alpha=0.1, feature_cols=feature_cols
    )
    metrics_p10 = evaluate_model(model_p10, X_val, y_val, alpha=0.1)

    console.log("Training P50 model (median)...")
    model_p50 = train_quantile_model(
        X_train, y_train, X_val, y_val, alpha=0.5, feature_cols=feature_cols
    )
    metrics_p50 = evaluate_model(model_p50, X_val, y_val, alpha=0.5)

    console.log("Training P90 model (upper bound)...")
    model_p90 = train_quantile_model(
        X_train, y_train, X_val, y_val, alpha=0.9, feature_cols=feature_cols
    )
    metrics_p90 = evaluate_model(model_p90, X_val, y_val, alpha=0.9)

    # Save model bundle
    model_bundle = {
        "models": {"p10": model_p10, "p50": model_p50, "p90": model_p90},
        "feature_columns": feature_cols,
        "metrics": {"p10": metrics_p10, "p50": metrics_p50, "p90": metrics_p90},
        "trained_at": datetime.utcnow().isoformat(),
        "version": f"v{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
        "lookback_days": args.lookback_days,
    }

    dump(model_bundle, args.output)
    console.log(f"[green][OK][/green] Model saved to {args.output}")

    # Print metrics
    console.log("\n[bold]Validation Metrics:[/bold]")
    for q in ["p10", "p50", "p90"]:
        m = model_bundle["metrics"][q]
        console.log(f"  {q.upper()}: MAE={m['mae']:.2f}, Pinball={m['pinball_loss']:.2f}")

    # Feature importance (from P50 model)
    importance = dict(
        zip(feature_cols, model_p50.feature_importance(importance_type="gain"), strict=False)
    )
    top_features = sorted(importance.items(), key=lambda x: x[1], reverse=True)[:15]
    console.log("\n[bold]Top 15 Features (P50):[/bold]")
    for feat, imp in top_features:
        console.log(f"  {feat}: {imp:.1f}")

    conn.close()
    console.rule("[bold green]Training complete![/bold green]")


if __name__ == "__main__":
    main()
