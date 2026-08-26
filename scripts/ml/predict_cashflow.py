#!/usr/bin/env python3
"""
LedgerFlow: Daily Cash Flow Prediction

Generates 13-week cash flow forecasts using the trained quantile regression models.
Runs daily via cron, writes predictions to DuckDB for dashboard consumption.

Usage:
    python scripts/predict_cashflow.py --db data/ledgerflow.duckdb --model models/cash_forecast.joblib
"""

import argparse
from datetime import datetime, timedelta
from pathlib import Path

import duckdb
import numpy as np
import polars as pl
from joblib import load
from rich.console import Console

console = Console()

HORIZON_DAYS = 91  # 13 weeks


def load_model(model_path: Path) -> dict:
    """Load model bundle."""
    console.log(f"Loading model from {model_path}")
    return load(model_path)


def prepare_latest_features(conn: duckdb.DuckDBPyConnection, feature_cols: list) -> np.ndarray:
    """Prepare feature vector for the most recent date."""

    # Get the last 30 days of daily cash flow data (same as training)
    query = """
        SELECT
            posted_date,
            SUM(CASE WHEN net_amount_usd > 0 THEN net_amount_usd ELSE 0 END) AS inflows_usd,
            SUM(CASE WHEN net_amount_usd < 0 THEN -net_amount_usd ELSE 0 END) AS outflows_usd,
            SUM(net_amount_usd) AS net_flow_usd,
            COUNT(*) FILTER (WHERE type IN ('charge', 'invoice_payment') AND status = 'succeeded') AS n_charges,
            COUNT(*) FILTER (WHERE type = 'refund' AND status = 'succeeded') AS n_refunds,
            COUNT(*) FILTER (WHERE type = 'payout' AND status = 'succeeded') AS n_payouts,
            COUNT(*) FILTER (WHERE type = 'fee' AND status = 'succeeded') AS n_fees,
            COALESCE(SUM(amount_usd) FILTER (WHERE type IN ('charge', 'invoice_payment') AND status = 'succeeded'), 0.0) AS gross_revenue_usd,
            COALESCE(SUM(amount_usd) FILTER (WHERE type = 'refund' AND status = 'succeeded'), 0.0) AS refunds_usd
        FROM transactions
        WHERE basis = 'cash'
          AND status = 'succeeded'
          AND posted_date >= CURRENT_DATE - INTERVAL '60 days'
        GROUP BY posted_date
        ORDER BY posted_date
    """
    daily = conn.execute(query).pl()

    if len(daily) < 30:
        raise ValueError(f"Need at least 30 days of data, got {len(daily)}")

    # Same feature engineering as training
    df = daily.with_columns(
        [
            pl.col("posted_date").dt.weekday().alias("dow"),
            pl.col("posted_date").dt.day().alias("day_of_month"),
            pl.col("posted_date").dt.month().alias("month"),
            pl.col("posted_date").dt.quarter().alias("quarter"),
            pl.col("posted_date").dt.year().alias("year"),
            (pl.col("posted_date").dt.weekday() >= 6).cast(pl.Int32).alias("is_weekend"),
            (pl.col("posted_date").dt.day() <= 5).cast(pl.Int32).alias("is_month_start"),
            (pl.col("posted_date").dt.day() >= 25).cast(pl.Int32).alias("is_month_end"),
            *[
                pl.col("net_flow_usd").shift(i).alias(f"net_flow_lag_{i}d")
                for i in [1, 2, 3, 7, 14, 30]
            ],
            *[pl.col("inflows_usd").shift(i).alias(f"inflows_lag_{i}d") for i in [1, 7, 30]],
            *[pl.col("outflows_usd").shift(i).alias(f"outflows_lag_{i}d") for i in [1, 7, 30]],
            pl.col("net_flow_usd").rolling_mean(7).alias("net_flow_ma_7d"),
            pl.col("net_flow_usd").rolling_std(7).alias("net_flow_std_7d"),
            pl.col("net_flow_usd").rolling_mean(30).alias("net_flow_ma_30d"),
            pl.col("net_flow_usd").rolling_std(30).alias("net_flow_std_30d"),
            pl.col("inflows_usd").rolling_mean(7).alias("inflows_ma_7d"),
            pl.col("outflows_usd").rolling_mean(7).alias("outflows_ma_7d"),
            pl.col("net_flow_usd").cum_sum().alias("cumulative_cash_usd"),
            (pl.col("net_flow_usd") - pl.col("net_flow_usd").shift(7)).alias("net_flow_wow_change"),
            (pl.col("net_flow_usd") - pl.col("net_flow_usd").shift(30)).alias(
                "net_flow_mom_change"
            ),
        ]
    )

    df = df.drop_nulls()

    # Get the last row (most recent date)
    latest = df.tail(1)
    X = latest.select(feature_cols).to_numpy()

    # Also get current cash position
    current_cash = latest["cumulative_cash_usd"].item()
    last_date = latest["posted_date"].item()

    console.log(f"Last data date: {last_date}, Current cash: ${current_cash:,.2f}")

    return X, current_cash, last_date


def generate_forecast(
    model_bundle: dict, X: np.ndarray, current_cash: float, last_date: datetime, horizon: int
) -> pl.DataFrame:
    """Generate multi-horizon forecast using recursive prediction."""

    models = model_bundle["models"]

    # We'll predict day by day, updating features recursively
    # For simplicity, use the same feature vector for all horizons (approximation)
    # In production, you'd update lag features recursively

    predictions = []
    cumulative_cash = current_cash

    for h in range(1, horizon + 1):
        pred_date = last_date + timedelta(days=h)

        # Predict net flow for this horizon
        p10 = models["p10"].predict(X, num_iteration=models["p10"].best_iteration)[0]
        p50 = models["p50"].predict(X, num_iteration=models["p50"].best_iteration)[0]
        p90 = models["p90"].predict(X, num_iteration=models["p90"].best_iteration)[0]

        # For inflows/outflows, use simple proportion from history
        # (In production, train separate models for each)
        inflow_ratio = 0.6  # Approximate
        p50_inflows = p50 * inflow_ratio if p50 > 0 else -p50 * (1 - inflow_ratio)
        p50_outflows = p50 - p50_inflows

        cumulative_cash_p10 = cumulative_cash + p10
        cumulative_cash_p50 = cumulative_cash + p50
        cumulative_cash_p90 = cumulative_cash + p90

        # Runway calculation
        def calc_runway(cash, daily_flow):
            if daily_flow >= 0:
                return 999  # Infinite runway
            return int(cash / abs(daily_flow))

        p10_runway = calc_runway(cumulative_cash_p10, p10)
        p50_runway = calc_runway(cumulative_cash_p50, p50)
        p90_runway = calc_runway(cumulative_cash_p90, p90)

        predictions.append(
            {
                "forecast_date": datetime.utcnow().date(),
                "prediction_date": pred_date,
                "horizon_days": h,
                "p10_net_flow_usd": float(p10),
                "p50_net_flow_usd": float(p50),
                "p90_net_flow_usd": float(p90),
                "p50_inflows_usd": float(max(0, p50_inflows)),
                "p50_outflows_usd": float(max(0, -p50_outflows)),
                "starting_cash_usd": float(current_cash),
                "p10_cumulative_cash_usd": float(cumulative_cash_p10),
                "p50_cumulative_cash_usd": float(cumulative_cash_p50),
                "p90_cumulative_cash_usd": float(cumulative_cash_p90),
                "p10_runway_days": p10_runway,
                "p50_runway_days": p50_runway,
                "p90_runway_days": p90_runway,
                "model_version": model_bundle["version"],
                "model_trained_at": model_bundle["trained_at"],
                "feature_set_version": "v1",
            }
        )

        cumulative_cash = cumulative_cash_p50  # Update for next iteration

    return pl.DataFrame(predictions)


def write_predictions(df: pl.DataFrame, db_path: Path) -> int:
    """Write predictions to DuckDB."""
    conn = duckdb.connect(str(db_path))

    conn.register("staging_forecast", df)
    conn.execute("""
        INSERT INTO ml.cash_flow_forecast BY NAME
        SELECT * FROM staging_forecast
        ON CONFLICT (forecast_date, prediction_date) DO UPDATE SET
            p10_net_flow_usd = EXCLUDED.p10_net_flow_usd,
            p50_net_flow_usd = EXCLUDED.p50_net_flow_usd,
            p90_net_flow_usd = EXCLUDED.p90_net_flow_usd,
            p50_inflows_usd = EXCLUDED.p50_inflows_usd,
            p50_outflows_usd = EXCLUDED.p50_outflows_usd,
            starting_cash_usd = EXCLUDED.starting_cash_usd,
            p10_cumulative_cash_usd = EXCLUDED.p10_cumulative_cash_usd,
            p50_cumulative_cash_usd = EXCLUDED.p50_cumulative_cash_usd,
            p90_cumulative_cash_usd = EXCLUDED.p90_cumulative_cash_usd,
            p10_runway_days = EXCLUDED.p10_runway_days,
            p50_runway_days = EXCLUDED.p50_runway_days,
            p90_runway_days = EXCLUDED.p90_runway_days,
            model_version = EXCLUDED.model_version,
            model_trained_at = EXCLUDED.model_trained_at,
            feature_set_version = EXCLUDED.feature_set_version
    """)

    count = conn.execute(
        "SELECT COUNT(*) FROM ml.cash_flow_forecast WHERE forecast_date = CURRENT_DATE"
    ).fetchone()[0]
    conn.close()

    return count


def main():
    parser = argparse.ArgumentParser(description="Generate daily cash flow forecast")
    parser.add_argument("--db", type=Path, default=Path("data/ledgerflow.duckdb"))
    parser.add_argument("--model", type=Path, default=Path("models/cash_forecast.joblib"))
    parser.add_argument("--horizon", type=int, default=91, help="Forecast horizon in days")
    args = parser.parse_args()

    console.rule("[bold blue]LedgerFlow Cash Flow Prediction[/bold blue]")

    model_bundle = load_model(args.model)
    console.log(f"Model version: {model_bundle['version']}, trained: {model_bundle['trained_at']}")

    conn = duckdb.connect(str(args.db), read_only=True)

    X, current_cash, last_date = prepare_latest_features(conn, model_bundle["feature_columns"])

    forecast_df = generate_forecast(model_bundle, X, current_cash, last_date, args.horizon)

    conn.close()

    # Write predictions
    count = write_predictions(forecast_df, args.db)

    console.log(f"[green][OK][/green] Generated {count} forecast rows (13 weeks)")
    console.log(f"  P50 Runway: {forecast_df['p50_runway_days'][0]} days")
    console.log(f"  P10 Runway: {forecast_df['p10_runway_days'][0]} days")
    console.log(f"  P90 Runway: {forecast_df['p90_runway_days'][0]} days")

    console.rule("[bold green]Prediction complete![/bold green]")


if __name__ == "__main__":
    main()
