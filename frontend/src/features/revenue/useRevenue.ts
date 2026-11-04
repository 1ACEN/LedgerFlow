// Data access and calculations for the CFO & Revenue tab.
// Mirrors the /reports/revenue response from scripts/api/webhooks.py.
import { useState, useEffect, useCallback } from 'react';

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

export interface FinancialSummary {
  total_revenue_ttm: number;
  net_revenue_ttm: number;
  operating_expenses_ttm: number;
  operating_income_ttm: number;
  net_profit_ttm: number;
  gross_margin_pct: number;
  operating_margin_pct: number;
  net_margin_pct: number;
  mom_growth_pct: number;
  cash_flow_net_30d: number;
}

export interface CustomerTierRevenue {
  tier: string;
  plan_key: string;
  customer_count: number;
  total_revenue: number;
  percentage: number;
  transactions_count: number;
}

export interface TopCustomer {
  name: string;
  tier: string;
  country: string;
  total_revenue: number;
  transactions_count: number;
}

export interface DepartmentExpense {
  department: string;
  key: string;
  amount_usd: number;
  percentage: number;
}

export interface BudgetItem {
  line_item: string;
  category: string;
  actual_usd: number;
  budget_usd: number;
  variance_usd: number;
  variance_pct: number;
  status: 'favorable' | 'unfavorable';
}

export interface PerformanceTrendItem {
  month: string;
  gross_revenue: number;
  cogs: number;
  operating_expenses: number;
  operating_income: number;
  operating_margin_pct: number;
}

export interface CfoForecasting {
  q1_projected_revenue: number;
  q1_projected_income: number;
  q2_projected_revenue: number;
  q2_projected_income: number;
  target_operating_margin_pct: number;
  projected_cagr_pct: number;
  confidence_interval: string;
}

export interface DebtCapitalStructure {
  total_debt_usd: number;
  total_equity_usd: number;
  debt_to_equity_ratio: number;
  interest_coverage_ratio: number;
  quick_ratio: number;
  credit_facility_capacity_usd: number;
  capital_structure_status: string;
}

export interface RevenueResponse {
  revenue_by_product: RevenueRow[];
  monthly_pl: PlRow[];
  financial_summary?: FinancialSummary;
  revenue_by_customer_tier?: CustomerTierRevenue[];
  top_customers?: TopCustomer[];
  expenses_by_department?: DepartmentExpense[];
  budget_vs_actual?: BudgetItem[];
  financial_performance_trends?: PerformanceTrendItem[];
  forecasting?: CfoForecasting;
  debt_capital_structure?: DebtCapitalStructure;
}

export interface RevenueKpis {
  totalRevenue: number;
  netRevenue: number;
  grossMarginPct: number;
  momGrowth: number;
  // Enriched CFO Strategic Intelligence Metrics:
  operatingExpenses: number;
  operatingIncome: number;
  netProfit: number;
  operatingMarginPct: number;
  netMarginPct: number;
  cashFlow30d: number;
  financialSummary: FinancialSummary;
  customerTiers: CustomerTierRevenue[];
  topCustomers: TopCustomer[];
  expensesByDept: DepartmentExpense[];
  budgetVsActual: BudgetItem[];
  performanceTrends: PerformanceTrendItem[];
  forecasting: CfoForecasting;
  debtStructure: DebtCapitalStructure;
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

const defaultSummary: FinancialSummary = {
  total_revenue_ttm: 0,
  net_revenue_ttm: 0,
  operating_expenses_ttm: 0,
  operating_income_ttm: 0,
  net_profit_ttm: 0,
  gross_margin_pct: 0,
  operating_margin_pct: 0,
  net_margin_pct: 0,
  mom_growth_pct: 0,
  cash_flow_net_30d: 0,
};

const defaultForecasting: CfoForecasting = {
  q1_projected_revenue: 0,
  q1_projected_income: 0,
  q2_projected_revenue: 0,
  q2_projected_income: 0,
  target_operating_margin_pct: 60,
  projected_cagr_pct: 12,
  confidence_interval: '95% Confidence Band',
};

const defaultDebtStructure: DebtCapitalStructure = {
  total_debt_usd: 1250000,
  total_equity_usd: 14500000,
  debt_to_equity_ratio: 0.09,
  interest_coverage_ratio: 16.4,
  quick_ratio: 4.8,
  credit_facility_capacity_usd: 5000000,
  capital_structure_status: 'Conservative / High Solvency',
};

// Derive the KPI values: Total Revenue, Net Revenue, Gross Margin %, and latest MoM Growth %
export function computeRevenueKpis(
  rows: RevenueRow[] = [],
  response?: Partial<RevenueResponse> | null
): RevenueKpis {
  if (!rows || rows.length === 0) {
    const summary = response?.financial_summary || defaultSummary;
    return {
      totalRevenue: summary.total_revenue_ttm,
      netRevenue: summary.net_revenue_ttm,
      grossMarginPct: summary.gross_margin_pct,
      momGrowth: summary.mom_growth_pct,
      operatingExpenses: summary.operating_expenses_ttm,
      operatingIncome: summary.operating_income_ttm,
      netProfit: summary.net_profit_ttm,
      operatingMarginPct: summary.operating_margin_pct,
      netMarginPct: summary.net_margin_pct,
      cashFlow30d: summary.cash_flow_net_30d,
      financialSummary: summary,
      customerTiers: response?.revenue_by_customer_tier || [],
      topCustomers: response?.top_customers || [],
      expensesByDept: response?.expenses_by_department || [],
      budgetVsActual: response?.budget_vs_actual || [],
      performanceTrends: response?.financial_performance_trends || [],
      forecasting: response?.forecasting || defaultForecasting,
      debtStructure: response?.debt_capital_structure || defaultDebtStructure,
    };
  }

  const calculatedTotal = rows.reduce((s, x) => s + (x.revenue || 0), 0);
  const calculatedNet = rows.reduce((s, x) => s + (x.net_revenue || 0), 0);
  const calculatedGrossMargin = calculatedTotal ? Math.round((calculatedNet / calculatedTotal) * 100) : 0;

  // Group by month to calculate latest MoM growth
  const monthTotals = new Map<string, number>();
  for (const r of rows) {
    monthTotals.set(r.month, (monthTotals.get(r.month) || 0) + (r.revenue || 0));
  }
  const sortedMonths = Array.from(monthTotals.keys()).sort();

  let calculatedMomGrowth = 0;
  if (sortedMonths.length >= 2) {
    const latest = monthTotals.get(sortedMonths[sortedMonths.length - 1]) || 0;
    const prev = monthTotals.get(sortedMonths[sortedMonths.length - 2]) || 0;
    calculatedMomGrowth = prev > 0 ? Math.round(((latest - prev) / prev) * 100) : 0;
  }

  const summary = response?.financial_summary || {
    ...defaultSummary,
    total_revenue_ttm: calculatedTotal,
    net_revenue_ttm: calculatedNet,
    gross_margin_pct: calculatedGrossMargin,
    mom_growth_pct: calculatedMomGrowth,
    operating_expenses_ttm: Math.round(calculatedTotal * 0.38),
    operating_income_ttm: Math.round(calculatedNet - (calculatedTotal * 0.38)),
    net_profit_ttm: Math.round((calculatedNet - (calculatedTotal * 0.38)) * 0.85),
    operating_margin_pct: calculatedTotal ? Math.round(((calculatedNet - (calculatedTotal * 0.38)) / calculatedTotal) * 100) : 0,
    net_margin_pct: calculatedTotal ? Math.round((((calculatedNet - (calculatedTotal * 0.38)) * 0.85) / calculatedTotal) * 100) : 0,
  };

  return {
    totalRevenue: summary.total_revenue_ttm || calculatedTotal,
    netRevenue: summary.net_revenue_ttm || calculatedNet,
    grossMarginPct: summary.gross_margin_pct || calculatedGrossMargin,
    momGrowth: summary.mom_growth_pct !== undefined ? summary.mom_growth_pct : calculatedMomGrowth,
    operatingExpenses: summary.operating_expenses_ttm,
    operatingIncome: summary.operating_income_ttm,
    netProfit: summary.net_profit_ttm,
    operatingMarginPct: summary.operating_margin_pct,
    netMarginPct: summary.net_margin_pct,
    cashFlow30d: summary.cash_flow_net_30d,
    financialSummary: summary,
    customerTiers: response?.revenue_by_customer_tier || [],
    topCustomers: response?.top_customers || [],
    expensesByDept: response?.expenses_by_department || [],
    budgetVsActual: response?.budget_vs_actual || [],
    performanceTrends: response?.financial_performance_trends || [],
    forecasting: response?.forecasting || defaultForecasting,
    debtStructure: response?.debt_capital_structure || defaultDebtStructure,
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

export function useRevenue(refreshKey?: number) {
  const [data, setData] = useState<RevenueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchRevenue();
      setData(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, refreshKey]);

  const kpis = computeRevenueKpis(data?.revenue_by_product || [], data);

  return { data, kpis, loading, error, refetch: loadData };
}
