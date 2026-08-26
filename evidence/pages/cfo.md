---
title: "CFO / FP&A"
description: "Monthly P&L, variance analysis, and board-ready metrics"
---

```sql cfo_metrics
SELECT
    (SELECT SUM(revenue_usd) FROM ledgerflow.revenue_by_product WHERE month = DATE_TRUNC('month', CURRENT_DATE)::DATE) AS revenue_mtd,
    (SELECT SUM(net_revenue_usd) FROM ledgerflow.revenue_by_product WHERE month = DATE_TRUNC('month', CURRENT_DATE)::DATE) AS gross_profit_mtd,
    (SELECT cumulative_cash_usd FROM ledgerflow.daily_cash_position ORDER BY date DESC LIMIT 1) AS cash_balance
```

```sql revenue_by_product_trend
SELECT
    month,
    product_line,
    revenue_usd,
    net_revenue_usd
FROM ledgerflow.revenue_by_product
ORDER BY month, product_line
```

```sql monthly_pl_summary
SELECT
    month,
    account_code,
    net_usd
FROM ledgerflow.monthly_pl
ORDER BY month, account_code
```

# CFO / FP&A Dashboard

Monthly financial performance, revenue attribution, and strategic metrics for leadership.

## P&L Summary

<Grid cols=3>
  <BigValue
    data={cfo_metrics}
    value=revenue_mtd
    title="Revenue MTD"
    fmt="usd"
  />
  <BigValue
    data={cfo_metrics}
    value=gross_profit_mtd
    title="Net Revenue MTD"
    fmt="usd"
  />
  <BigValue
    data={cfo_metrics}
    value=cash_balance
    title="Cash Balance"
    fmt="usd"
  />
</Grid>

## Revenue by Product Line

<LineChart
  data={revenue_by_product_trend}
  x=month
  y=revenue_usd
  series=product_line
  title="Monthly Revenue by Product Line"
  yFmt="usd"
/>

## Monthly Net by Account Code

<BarChart
  data={monthly_pl_summary}
  x=month
  y=net_usd
  series=account_code
  title="Monthly Net USD by Account Code"
  yFmt="usd"
/>

## Board Summary

<Note>
### Key Financial Takeaways
- **Revenue Visibility**: Net revenue is tracked across accrual and cash recognition basis.
- **Liquidity & Runway**: Liquidity models are updated continuously with daily ML forecasting.
</Note>