# LedgerFlow — TODO Backlog

Daily rhythm: pick **one** item per day, implement it, commit on `main` with a real
message, and **push** (only pushed commits color the GitHub graph). If nothing was
done, skip the day — no empty commits.

---

## Dashboard — Redesigned Tabs (UI/UX Pro Max)

- [x] **Executive Overview (Executive Command Center):** Clean, premium, high-level design. 4 large KPI cards (Total Revenue, Total Expenses, Net Profit, Cash Balance), Cash Flow & Gross Margin metrics, Risk Indicators (Cash Runway, Burn Rate, Working Capital Ratio), Revenue vs Expenses comparison chart, Financial health & alerts, Executive Summary banner with actionable items.
- [x] **Cash Flow & Forecast (Analytical Data Intelligence):** Actual vs Forecast cash flow, Cash inflow and outflow source visualization, Monthly and quarterly historical & projection trends, Cash runway & reserves, Best-case / base-case / worst-case scenario matrix, Net cash flow, Operating cash flow, Free cash flow.
- [x] **CFO & Revenue (Strategic Financial Intelligence):** Strategic revenue growth and profitability metrics (Gross Margin, Operating Margin, Net Margin, TTM Revenue, Net Income), Customer & product segmentation, Department expense breakdown with cost optimization targets, Budget vs Actual variance matrix, Long-term financial performance trends, Debt-to-Equity & capital structure.
- [x] **Fintech Ops & AI (Modern AI Operations Console):** Real-time transaction monitoring (TPS, settled, failed, pending, disputed), AI anomaly detection feed with live pattern surveillance & system health score (98.4/100), Multi-gateway performance matrix (Stripe, Plaid, ACH, Adyen, Wire with auth rates and p95 latency), Fraud & risk indicators (ML risk tier distribution, network dispute rate in bps vs 90 bps threshold, representment win rate), Automation performance (Smart Retry Engine recovery, 81.4% win rate, 94.2% manual intervention reduction), AI-generated insights & recommendations.
- [x] **AR Aging (Collections & Risk Management Dashboard):** Outstanding receivables metrics (Total AR $205,051, 726 open invoices, 610 accounts, $282 avg open invoice), Current vs Overdue split analysis ($33,487 current / $171,564 overdue), 4-tier aging bucket analysis (0–30, 31–60, 61–90, 90+ days) with bad debt provisioning ($27,233 reserve) and recovery expectations, Collection Efficiency & Velocity (DSO 15.1d, Best Possible DSO 2.5d, Average Days Delinquent 12.6d, CEI 88.4%, $592k 30-day realized collections), High-risk overdue accounts queue with dunning escalation actions, Customer-wise operational ledger table with multi-bucket filters and live search.
- [x] Add consistent financial typography (`tabular-nums`, thousand separators, formatted currency/bps/percentages) across all tabs.

## AR Aging

- [x] Add a "top overdue customers" spotlight card (highest 90+ day balances) above the table
- [x] Color-code aging-bucket rows in the table by severity (Current → 90+) with a legend
- [x] Show days-weighted average (DSO proxy) as a KPI
- [x] Comprehensive Collections & Risk Management redesign with action-oriented triggers, bad debt provisioning, and interactive ledger filters

## Data / realism (demo generator)

- [x] Fix the synthetic data so MoM growth doesn't spike ~438% off a tiny base month
- [x] Reduce 90+ overdue concentration (currently ~81% of AR is 90+) so buckets look plausible
- [x] Add a `data/seed_docs` note or script comment documenting the generator assumptions

## API & tests

- [x] Add pytest coverage for `/reports/revenue` (shape, totals, product grouping)
- [x] Add pytest coverage for `/reports/ar-aging` (bucket math, totals)
- [x] Add pytest coverage for `/reports/cashflow` (scenarios, trends, inflows/outflows)
- [x] Add pytest coverage for `/reports/executive` (summary, revenue vs expenses, health indicators)
- [x] Add pytest coverage for `/reports/ops` (enriched AI anomaly detection, gateways, fraud tiers, retry advisor)
- [x] Add a smoke test that `GET /` includes the `Cache-Control: no-store` header
- [ ] Wire the probe scripts (CDP screenshots) into the Makefile as `make smoke-dash`

## Role-Based Access Control (RBAC), Authentication & Navigation Architecture

- [x] **Users Database & Cryptographic Verification (`scripts/api/auth_db.py`, `init_db.py`):**
  - DuckDB `users` table storing `user_id`, `username`, `password_hash`, `salt`, `full_name`, `role_id`, and `created_at`.
  - PBKDF2 HMAC-SHA256 password hashing with 100,000 iterations and 16-byte random salt per user. Constant-time digest comparison (`secrets.compare_digest`).
  - Auto-seeding of default initial accounts (`admin`/`admin`, `executive`/`exec`, `cfo`/`cfo`, `ops`/`ops`, `credit`/`credit`) on clean startup.
  - Fast-API endpoints:
    - `POST /api/auth/login`: Authenticates user credentials against DuckDB.
    - `POST /api/auth/signup`: Registers new user accounts into DuckDB with validation and duplicate prevention.
    - `GET /api/auth/roles`: Returns list of available organizational roles and access scopes.
- [x] **Enterprise Login & Sign-Up Gateway (`LoginPage.tsx`, `LoginPage.css`, `AuthContext.tsx`):**
  - Inputs start completely empty (`useState('')`) — strictly no auto-fill or unwanted bypass on deployed instances.
  - Removed "Instant 1-Click Launch" button to enforce zero-trust authentication.
  - Clean segmented mode switch between **Sign In** and **Create Account**.
  - Full Sign-Up registration flow: Full Name, Username, Role selection (Admin, Executive, CFO, Ops, Credit), Password, and Confirm Password.
  - UI/UX Pro Max redesign: Eliminated distracting multi-color radial gradient meshes in Night mode. Replaced with calm, solid obsidian `#080B11` / `#101522` surfaces, crisp 1px borders, and solid enterprise `#2563EB` action button.
  - Collapsible reference drawer displaying verified default seed accounts without auto-filling fields.
- [x] **Left Slide-out Drawer Navigation (`Sidebar.tsx`, `Sidebar.css`):**
  - Toggled via the top bar three lines button (`☰`), closed by default.
  - Dynamically renders **strictly the authorized modules** for the active role (e.g. 2 for Credit, 4 for Executive, 6 for Admin).
  - Cleaned all lock icons and visual clutter from navigation and dashboard.
  - Houses the user profile card (name, avatar, title, clearance badge, active modules count), API Docs external link, and Switch Role action.
  - Non-vibe-coded architectural fintech design with dual Day/Night theme support.
- [x] **Minimalist Single-Refresh Top Bar (`App.tsx`, `theme.css`):**
  - Streamlined 64px header featuring: Three lines menu trigger, official emblem icon beside "LedgerFlow", Last Updated timestamp, Live status pill (`• Live`), Day/Night toggle switch, and the single unified Refresh button.
  - Removed duplicate refresh buttons across all 5 tab views (`ArAgingTab`, `CashflowTab`, `ExecutiveTab`, `OpsTab`, `RevenueTab`) so that the top bar control is the one and only refresh button of the dashboard.
- [x] **1-Second Dynamic Line Chart Transition Box (`LoadingBox.tsx`, `LoadingBox.css`):**
  - Centered glassmorphic transition card triggered upon site entry and page transitions.
  - SVG line chart traversing forward and rising to a peak with cyan-blue-indigo logo gradients, animated area fill, data nodes, and pulsing beacon.
  - Fully reactive to both Day (light) and Night (dark) themes.

## Polish & DX

- [x] Add a "Last updated" timestamp to the dashboard header (ties in with the no-store fix)
- [x] Refined theme tokens with smooth slate/zinc dark mode palette, subtle glassmorphism cards, and non-vibe-coded CSS styling
- [x] Removed unused landing animation files, geometry slices, and dev screenshot helpers
- [ ] Chart hover tooltips: add delta/context on combo-chart points
- [ ] Dark/light theme check across all 6 tabs once, fix any chart that renders illegible in one theme
- [ ] `README.md`: add a one-line "how to see your contribution graph count your commits" note? (only if it helps)

---
### Done
- [x] CFO & Revenue: KPI strip, stacked product bars, revenue+MoM combo, product-mix doughnut, income statement
- [x] AR Aging: KPI strip + aging-bucket doughnut, table retained
- [x] Fix browser caching (`Cache-Control: no-store`) and `switch
Tab()` param bug
