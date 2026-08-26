---
title: "LedgerFlow"
description: "Financial Observability Platform"
---

```sql stats
SELECT
    (SELECT cumulative_cash_usd FROM ledgerflow.daily_cash_position ORDER BY date DESC LIMIT 1) AS current_cash,
    (SELECT p50_runway_days FROM ledgerflow.forecasts ORDER BY forecast_date DESC LIMIT 1) AS runway_p50,
    (SELECT success_rate FROM ledgerflow.success_rate_daily ORDER BY occurred_date DESC LIMIT 1) AS success_rate_24h,
    (SELECT SUM(outflows_usd) / 30.0 FROM ledgerflow.daily_cash_position WHERE date >= CURRENT_DATE - INTERVAL '30 days') AS net_burn_30d
```

```sql last_ingested
SELECT MAX(ingested_at) AS last_ingested FROM ledgerflow.transactions
```

# LedgerFlow

**Real-time financial observability platform** — unifying payment operations, cash forecasting, and FP&A views on a single transaction ledger.

<Grid cols=4>
  <BigLink url="/live" title="⚡ Live Pipeline">
    Real-time streaming ledger, manual transaction entry, and live gateway webhook health.
  </BigLink>
  <BigLink url="/ops" title="Fintech Ops">
    Real-time payment health: success rates, decline analysis, payout tracking, and dispute monitoring.
  </BigLink>
  <BigLink url="/cashflow" title="Cash Flow">
    Daily cash position, 13-week forecast with ML prediction intervals (P10/P50/P90), and AR aging.
  </BigLink>
  <BigLink url="/cfo" title="CFO / FP&A">
    Monthly P&L, revenue breakdown by product line, cash burn, and financial trends.
  </BigLink>
</Grid>

## Quick Stats

<Grid cols=4>
  <BigValue
    data={stats}
    value=current_cash
    title="Current Cash"
    fmt="usd"
  />
  <BigValue
    data={stats}
    value=runway_p50
    title="Runway (P50)"
    fmt="#,##0"
  />
  <BigValue
    data={stats}
    value=success_rate_24h
    title="Success Rate (24h)"
    fmt="0.0%"
  />
  <BigValue
    data={stats}
    value=net_burn_30d
    title="Daily Outflow (30d avg)"
    fmt="usd"
  />
</Grid>

## Data Freshness

Last Ingestion: <Value data={last_ingested} column=last_ingested fmt="yyyy-mm-dd hh:mm" />