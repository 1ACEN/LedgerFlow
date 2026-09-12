// Data access and calculations for the CFO & Revenue tab.
// Mirrors the /reports/revenue response from scripts/api/webhooks.py.

export interface RevenueRow {
  month: string;
  product_line: string;
  revenue: number;
  net_revenue: number;
}

export interface PlRow {
  month: string;
  account_code: string;
  net: number;
}

export interface RevenueResponse {
  revenue_by_product: RevenueRow[];
  monthly_pl: PlRow[];
}

export interface RevenueKpis {
  totalRevenue: number;
  netRevenue: number;
  grossMarginPct: number;
  momGrowth: number;
}

export interface ProductMonthGroup {
  month: string;
  rows: RevenueRow[];
  gross: number;
  net: number;
}

export interface ProductTotal {
  productLine: string;
  label: string;
  total: number;
}

export function formatProductLine(p: string): string {
  return p.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// Derive the 4 KPI values: Total Revenue, Net Revenue, Gross Margin %, and latest MoM Growth %
export function computeRevenueKpis(rows: RevenueRow[]): RevenueKpis {
  if (!rows || rows.length === 0) {
    return { totalRevenue: 0, netRevenue: 0, grossMarginPct: 0, momGrowth: 0 };
  }

  const totalRevenue = rows.reduce((s, x) => s + (x.revenue || 0), 0);
  const netRevenue = rows.reduce((s, x) => s + (x.net_revenue || 0), 0);
  const grossMarginPct = totalRevenue ? Math.round((netRevenue / totalRevenue) * 100) : 0;

  // Group by month to calculate latest MoM growth
  const monthTotals = new Map<string, number>();
  for (const r of rows) {
    monthTotals.set(r.month, (monthTotals.get(r.month) || 0) + (r.revenue || 0));
  }
  const sortedMonths = Array.from(monthTotals.keys()).sort();

  let momGrowth = 0;
  if (sortedMonths.length >= 2) {
    const latest = monthTotals.get(sortedMonths[sortedMonths.length - 1]) || 0;
    const prev = monthTotals.get(sortedMonths[sortedMonths.length - 2]) || 0;
    momGrowth = prev > 0 ? Math.round(((latest - prev) / prev) * 100) : 0;
  }

  return {
    totalRevenue,
    netRevenue,
    grossMarginPct,
    momGrowth,
  };
}

// Calculate chronological monthly totals and MoM growth rate per month
export function computeMoMGrowth(rows: RevenueRow[]) {
  const monthMap = new Map<string, number>();
  for (const r of rows) {
    monthMap.set(r.month, (monthMap.get(r.month) || 0) + (r.revenue || 0));
  }
  const months = Array.from(monthMap.keys()).sort();
  const totals = months.map((m) => monthMap.get(m) || 0);

  const momGrowth: (number | null)[] = totals.map((val, i) => {
    if (i === 0) return null;
    const prev = totals[i - 1];
    return prev > 0 ? Math.round(((val - prev) / prev) * 100) : 0;
  });

  return { months, totals, momGrowth };
}

// Compute product totals across all months for the product mix doughnut chart
export function computeProductTotals(rows: RevenueRow[]): ProductTotal[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    map.set(r.product_line, (map.get(r.product_line) || 0) + (r.revenue || 0));
  }
  return Array.from(map.entries())
    .map(([p, total]) => ({
      productLine: p,
      label: formatProductLine(p),
      total: Math.round(total * 100) / 100,
    }))
    .sort((a, b) => b.total - a.total);
}

// Group revenue rows by month in reverse chronological order for the income statement table
export function groupIncomeStatement(rows: RevenueRow[]): ProductMonthGroup[] {
  const monthSet = new Set(rows.map((r) => r.month));
  const months = Array.from(monthSet).sort().reverse();

  return months.map((m) => {
    const mRows = rows
      .filter((r) => r.month === m)
      .sort((a, b) => a.product_line.localeCompare(b.product_line));
    const gross = mRows.reduce((s, r) => s + r.revenue, 0);
    const net = mRows.reduce((s, r) => s + r.net_revenue, 0);
    return {
      month: m,
      rows: mRows,
      gross: Math.round(gross * 100) / 100,
      net: Math.round(net * 100) / 100,
    };
  });
}

export async function fetchRevenue(): Promise<RevenueResponse> {
  const r = await fetch('/reports/revenue');
  if (!r.ok) throw new Error(`reports/revenue returned ${r.status}`);
  return (await r.json()) as RevenueResponse;
}
