# LedgerFlow — TODO Backlog

Daily rhythm: pick **one** item per day, implement it, commit on `main` with a real
message, and **push** (only pushed commits color the GitHub graph). If nothing was
done, skip the day — no empty commits.

---

## Dashboard — remaining tabs (Qlik-style, lighter touch)

- [ ] Executive Overview: add a KPI strip (revenue TTM, customers, MRR/churn proxy, cash position) matching CFO & Revenue
- [ ] Cash Flow & Forecast: overlay a rolling 7-day or 30-day forecast line on the existing series
- [ ] Fintech Ops & AI: add a doughnut or stacked bar for transaction-status mix (settled / pending / failed)
- [ ] Add a consistent KPI/`tabular-nums` + thousand-separator convention across every tab

## AR Aging

- [x] Add a "top overdue customers" spotlight card (highest 90+ day balances) above the table
- [x] Color-code aging-bucket rows in the table by severity (Current → 90+) with a legend
- [ ] Show days-weighted average (DSO proxy) as a KPI

## Data / realism (demo generator)

- [ ] Fix the synthetic data so MoM growth doesn't spike ~438% off a tiny base month
- [ ] Reduce 90+ overdue concentration (currently ~81% of AR is 90+) so buckets look plausible
- [ ] Add a `data/seed_docs` note or script comment documenting the generator assumptions

## API & tests

- [x] Add pytest coverage for `/reports/revenue` (shape, totals, product grouping)
- [x] Add pytest coverage for `/reports/ar-aging` (bucket math, totals)
- [x] Add a smoke test that `GET /` includes the `Cache-Control: no-store` header
- [ ] Wire the probe scripts (CDP screenshots) into the Makefile as `make smoke-dash`

## Polish & DX

- [x] Add a "Last updated" timestamp to the dashboard header (ties in with the no-store fix)
- [ ] Chart hover tooltips: add delta/context on combo-chart points
- [ ] Dark/light theme check across all 6 tabs once, fix any chart that renders illegible in one theme
- [ ] `README.md`: add a one-line "how to see your contribution graph count your commits" note? (only if it helps)

---
### Done
- [x] CFO & Revenue: KPI strip, stacked product bars, revenue+MoM combo, product-mix doughnut, income statement
- [x] AR Aging: KPI strip + aging-bucket doughnut, table retained
- [x] Fix browser caching (`Cache-Control: no-store`) and `switchTab()` param bug