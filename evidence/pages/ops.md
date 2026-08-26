---
title: "Fintech Ops"
description: "Real-time payments operations dashboard"
---

```sql ops_metrics
SELECT
    (SELECT COUNT(*) FILTER (WHERE status = 'succeeded') * 1.0 / NULLIF(COUNT(*), 0) FROM ledgerflow.transactions WHERE type IN ('charge', 'invoice_payment') AND occurred_at >= CURRENT_DATE - INTERVAL '1 day') AS success_rate_24h,
    (SELECT COUNT(*) FROM ledgerflow.transactions WHERE occurred_at >= CURRENT_DATE - INTERVAL '1 day') AS volume_24h,
    (SELECT COUNT(dispute_id) * 1.0 / NULLIF(COUNT(*), 0) FROM ledgerflow.transactions WHERE occurred_at >= CURRENT_DATE - INTERVAL '7 days') AS dispute_rate_7d,
    (SELECT COUNT(*) FILTER (WHERE status = 'succeeded') * 1.0 / NULLIF(COUNT(*), 0) FROM ledgerflow.transactions WHERE type = 'payout' AND occurred_at >= CURRENT_DATE - INTERVAL '30 days') AS payout_health
```

```sql success_rate_trend
SELECT occurred_date, source, success_rate
FROM ledgerflow.success_rate_daily
WHERE occurred_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY occurred_date DESC
```

```sql decline_breakdown
SELECT decline_code, total_declines AS count
FROM ledgerflow.decline_analysis
ORDER BY total_declines DESC
LIMIT 10
```

```sql decline_advisor_table
SELECT
    transaction_id,
    decline_code,
    card_brand,
    card_funding,
    amount_usd,
    retry_success_probability,
    recommended_action,
    expected_recovery_usd
FROM ledgerflow.decline_predictions
LIMIT 50
```

```sql payout_timeline
SELECT
    occurred_date,
    status,
    SUM(amount_usd) AS net_amount_usd
FROM ledgerflow.transactions
WHERE type = 'payout' AND occurred_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY occurred_date, status
ORDER BY occurred_date
```

```sql disputes_table
SELECT
    dispute_id,
    transaction_id,
    customer_id,
    amount_usd,
    dispute_status,
    dispute_created_at AS created_at,
    due_by
FROM ledgerflow.disputes
LIMIT 50
```

# Fintech Operations Dashboard

Real-time visibility into payment health, success rates, and operational metrics.

## Key Metrics

<Grid cols=4>
  <BigValue
    data={ops_metrics}
    value=success_rate_24h
    title="Success Rate (24h)"
    fmt="0.0%"
  />
  <BigValue
    data={ops_metrics}
    value=volume_24h
    title="Transaction Volume (24h)"
    fmt="#,##0"
  />
  <BigValue
    data={ops_metrics}
    value=dispute_rate_7d
    title="Dispute Rate (7d)"
    fmt="0.00%"
  />
  <BigValue
    data={ops_metrics}
    value=payout_health
    title="Payout Health (30d)"
    fmt="0.0%"
  />
</Grid>

## Success Rate Trend

<LineChart
  data={success_rate_trend}
  x=occurred_date
  y=success_rate
  series=source
  title="Success Rate by Source (Last 30 Days)"
/>

## Decline Code Breakdown

<BarChart
  data={decline_breakdown}
  x=decline_code
  y=count
  title="Top Decline Codes (Last 7 Days)"
  sort="desc"
/>

## Decline Retry Advisor

<DataTable
  data={decline_advisor_table}
  title="Decline Retry Recommendations"
  search=true
/>

## Payout Tracking

<LineChart
  data={payout_timeline}
  x=occurred_date
  y=net_amount_usd
  series=status
  title="Payout Timeline (Last 30 Days)"
/>

## Dispute Monitoring

<DataTable
  data={disputes_table}
  title="Active Disputes Requiring Action"
  search=true
/>