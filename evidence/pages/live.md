---
title: "Live Data Pipeline"
description: "Real-time payment streaming and transaction ingestion feed"
---

```sql live_metrics
SELECT
    COUNT(*) AS total_transactions,
    COUNT(*) FILTER (WHERE occurred_at >= CURRENT_DATE - INTERVAL '1 day') AS volume_24h,
    COALESCE(SUM(amount_usd) FILTER (WHERE occurred_at >= CURRENT_DATE - INTERVAL '1 day'), 0) AS total_usd_24h,
    COUNT(*) FILTER (WHERE status = 'succeeded' AND occurred_at >= CURRENT_DATE - INTERVAL '1 day') * 1.0 / NULLIF(COUNT(*) FILTER (WHERE occurred_at >= CURRENT_DATE - INTERVAL '1 day'), 0) AS success_rate_24h,
    MAX(ingested_at) AS last_ingested
FROM ledgerflow.transactions
```

```sql live_stream_table
SELECT
    transaction_id,
    occurred_at,
    type,
    status,
    source,
    amount_usd,
    net_amount_usd,
    fee_amount_usd,
    currency,
    product_line,
    description
FROM ledgerflow.transactions
ORDER BY ingested_at DESC
LIMIT 50
```

```sql source_breakdown
SELECT
    source,
    COUNT(*) AS count,
    SUM(amount_usd) AS total_volume_usd
FROM ledgerflow.transactions
GROUP BY source
ORDER BY count DESC
```

# Live Data Pipeline & Real-Time Feed

Real-time streaming ledger connected directly to DuckDB with instant webhook processing and synthetic stream simulation.

<Note>
💡 **Interactive Live Dashboard & Data Entry Form**: You can also use the unified single-pane live interface directly at [http://localhost:8080](http://localhost:8080) to manually submit transactions with instant visual feedback and live animated updates.
</Note>

## Pipeline Health & Ingestion Metrics

<Grid cols=4>
  <BigValue
    data={live_metrics}
    value=total_transactions
    title="Total Transactions"
    fmt="#,##0"
  />
  <BigValue
    data={live_metrics}
    value=volume_24h
    title="24h Ingested Volume"
    fmt="#,##0"
  />
  <BigValue
    data={live_metrics}
    value=total_usd_24h
    title="24h Gross Volume"
    fmt="usd"
  />
  <BigValue
    data={live_metrics}
    value=success_rate_24h
    title="24h Success Rate"
    fmt="0.0%"
  />
</Grid>

## Ingestion Volume by Source

<BarChart
  data={source_breakdown}
  x=source
  y=count
  title="Transactions Ingested by Source Gateway"
/>

## Most Recent Ingested Transactions (Live Stream)

<DataTable
  data={live_stream_table}
  title="Recent Transaction Ledger"
  search=true
  rows=20
/>
