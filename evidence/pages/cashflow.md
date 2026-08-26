---
title: "Cash Flow"
description: "13-week cash forecast with ML prediction intervals"
---

```sql cash_metrics
SELECT
    (SELECT cumulative_cash_usd FROM ledgerflow.daily_cash_position ORDER BY date DESC LIMIT 1) AS current_cash,
    (SELECT SUM(outflows_usd) / 30.0 FROM ledgerflow.daily_cash_position WHERE date >= CURRENT_DATE - INTERVAL '30 days') AS net_burn_30d,
    (SELECT p50_runway_days FROM ledgerflow.forecasts ORDER BY forecast_date DESC LIMIT 1) AS runway_p50,
    (SELECT p10_runway_days FROM ledgerflow.forecasts ORDER BY forecast_date DESC LIMIT 1) AS runway_p10,
    (SELECT p90_runway_days FROM ledgerflow.forecasts ORDER BY forecast_date DESC LIMIT 1) AS runway_p90
```

```sql forecast_fan
SELECT
    prediction_date,
    p10_cumulative_cash_usd,
    p50_cumulative_cash_usd,
    p90_cumulative_cash_usd,
    p50_inflows_usd,
    p50_outflows_usd
FROM ledgerflow.forecasts
ORDER BY prediction_date
```

```sql weekly_cash_flow
SELECT
    DATE_TRUNC('week', date)::DATE AS week_start,
    SUM(inflows_usd) AS inflows_usd,
    SUM(outflows_usd) AS outflows_usd,
    SUM(net_flow_usd) AS net_flow_usd
FROM ledgerflow.daily_cash_position
GROUP BY DATE_TRUNC('week', date)
ORDER BY week_start
```

```sql ar_aging_table
SELECT
    customer_id,
    customer_name,
    invoice_count,
    total_outstanding_usd,
    current_usd,
    days_31_60_usd,
    days_61_90_usd,
    days_90_plus_usd
FROM ledgerflow.ar_aging
ORDER BY total_outstanding_usd DESC
LIMIT 50
```

# Cash Flow Dashboard

Daily cash position, 13-week forecast with quantile regression prediction intervals, and collections tracking.

## Current Position

<Grid cols=4>
  <BigValue
    data={cash_metrics}
    value=current_cash
    title="Current Cash Position"
    fmt="usd"
  />
  <BigValue
    data={cash_metrics}
    value=net_burn_30d
    title="Daily Outflow (30d avg)"
    fmt="usd"
  />
  <BigValue
    data={cash_metrics}
    value=runway_p50
    title="Runway (P50)"
    fmt="#,##0"
  />
  <BigValue
    data={cash_metrics}
    value=runway_p10
    title="P10 Conservative Runway"
    fmt="#,##0"
  />
</Grid>

## 13-Week Cash Forecast (Fan Chart)

<LineChart
  data={forecast_fan}
  x=prediction_date
  y=p50_cumulative_cash_usd
  title="13-Week Cumulative Cash Trajectory (P50)"
  yFmt="usd"
/>

<Note>
**How to read this chart:** The median (P50) forecast projects cumulative liquidity across the 13-week planning horizon.
</Note>

## Weekly Net Cash Flow

<BarChart
  data={weekly_cash_flow}
  x=week_start
  y=net_flow_usd
  title="Weekly Net Cash Flow"
  yFmt="usd"
/>

## Collections Aging (AR)

<DataTable
  data={ar_aging_table}
  title="Accounts Receivable Aging"
  search=true
/>