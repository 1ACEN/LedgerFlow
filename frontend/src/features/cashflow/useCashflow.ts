import { useState, useEffect, useCallback } from 'react';

export interface ForecastPoint {
  date: string;
  p10: number;
  p50: number;
  p90: number;
  inflows: number;
  outflows: number;
}

export interface WeeklyFlow {
  week: string;
  inflows: number;
  outflows: number;
  net: number;
}

export interface FlowBreakdownItem {
  category: string;
  amount: number;
  percentage: number;
}

export interface TrendPeriodItem {
  period: string;
  inflows: number;
  outflows: number;
  net_flow: number;
  ending_cash: number;
}

export interface ActualHistoryPoint {
  date: string;
  inflows: number;
  outflows: number;
  net: number;
  cash: number;
}

export interface ScenarioDetail {
  label: string;
  description: string;
  runway_days: number;
  ending_cash_90d: number;
  net_change_90d: number;
  daily_burn_or_growth: number;
}

export interface CashflowScenarios {
  worst_case: ScenarioDetail;
  base_case: ScenarioDetail;
  best_case: ScenarioDetail;
}

export interface CashflowResponse {
  forecast: ForecastPoint[];
  weekly: WeeklyFlow[];
  current_cash_reserves?: number;
  net_cash_flow_30d?: number;
  inflows_30d?: number;
  outflows_30d?: number;
  operating_cash_flow_30d?: number;
  free_cash_flow_30d?: number;
  inflows_breakdown?: FlowBreakdownItem[];
  outflows_breakdown?: FlowBreakdownItem[];
  monthly_trends?: TrendPeriodItem[];
  quarterly_trends?: TrendPeriodItem[];
  actual_history_30d?: ActualHistoryPoint[];
  scenarios?: CashflowScenarios;
}

export interface CashflowKpis {
  projectedEndingCash: number;
  confidenceSpread: number;
  historical12wNet: number;
  avgWeeklyNet: number;
  // Enriched Analytical Intelligence metrics:
  currentReserves: number;
  netCashFlow30d: number;
  inflows30d: number;
  outflows30d: number;
  operatingCashFlow30d: number;
  freeCashFlow30d: number;
  inflowsBreakdown: FlowBreakdownItem[];
  outflowsBreakdown: FlowBreakdownItem[];
  monthlyTrends: TrendPeriodItem[];
  quarterlyTrends: TrendPeriodItem[];
  actualHistory30d: ActualHistoryPoint[];
  scenarios: CashflowScenarios;
  p10RunwayDays: number;
  p50RunwayDays: number;
  p90RunwayDays: number;
}

const defaultScenarios: CashflowScenarios = {
  worst_case: {
    label: 'Worst-Case (P10 Conservative)',
    description: 'Lower collections (-20%), elevated refund & dispute rates, higher cash burn.',
    runway_days: 180,
    ending_cash_90d: 0,
    net_change_90d: 0,
    daily_burn_or_growth: 0,
  },
  base_case: {
    label: 'Base-Case (P50 Expected)',
    description: 'Statistical median quantile projection aligned with rolling operating baseline.',
    runway_days: 240,
    ending_cash_90d: 0,
    net_change_90d: 0,
    daily_burn_or_growth: 0,
  },
  best_case: {
    label: 'Best-Case (P90 Optimistic)',
    description: 'Accelerated collections (+15%), low refund rates, optimized operating liquidity.',
    runway_days: 365,
    ending_cash_90d: 0,
    net_change_90d: 0,
    daily_burn_or_growth: 0,
  },
};

export function computeCashflowKpis(
  forecast: ForecastPoint[] = [],
  weekly: WeeklyFlow[] = [],
  response?: Partial<CashflowResponse> | null
): CashflowKpis {
  let projectedEndingCash = 0;
  let confidenceSpread = 0;

  if (forecast && forecast.length > 0) {
    const latest = forecast[forecast.length - 1];
    projectedEndingCash = latest.p50;
    confidenceSpread = Math.max(0, Math.round((latest.p90 - latest.p10) * 100) / 100);
  }

  let historical12wNet = 0;
  let avgWeeklyNet = 0;

  if (weekly && weekly.length > 0) {
    historical12wNet = Math.round(weekly.reduce((s, w) => s + (w.net || 0), 0) * 100) / 100;
    avgWeeklyNet = Math.round((historical12wNet / weekly.length) * 100) / 100;
  }

  const currentReserves = response?.current_cash_reserves ?? (forecast.length > 0 ? forecast[0].p50 : 0);
  const netCashFlow30d = response?.net_cash_flow_30d ?? historical12wNet;
  const inflows30d = response?.inflows_30d ?? weekly.reduce((s, w) => s + (w.inflows || 0), 0);
  const outflows30d = response?.outflows_30d ?? weekly.reduce((s, w) => s + (w.outflows || 0), 0);
  const operatingCashFlow30d = response?.operating_cash_flow_30d ?? Math.round(netCashFlow30d * 0.95);
  const freeCashFlow30d = response?.free_cash_flow_30d ?? Math.round(operatingCashFlow30d * 0.7);

  const inflowsBreakdown = response?.inflows_breakdown ?? [];
  const outflowsBreakdown = response?.outflows_breakdown ?? [];
  const monthlyTrends = response?.monthly_trends ?? [];
  const quarterlyTrends = response?.quarterly_trends ?? [];
  const actualHistory30d = response?.actual_history_30d ?? [];
  const scenarios = response?.scenarios ?? defaultScenarios;

  const p10RunwayDays = scenarios.worst_case.runway_days;
  const p50RunwayDays = scenarios.base_case.runway_days;
  const p90RunwayDays = scenarios.best_case.runway_days;

  return {
    projectedEndingCash,
    confidenceSpread,
    historical12wNet,
    avgWeeklyNet,
    currentReserves,
    netCashFlow30d,
    inflows30d,
    outflows30d,
    operatingCashFlow30d,
    freeCashFlow30d,
    inflowsBreakdown,
    outflowsBreakdown,
    monthlyTrends,
    quarterlyTrends,
    actualHistory30d,
    scenarios,
    p10RunwayDays,
    p50RunwayDays,
    p90RunwayDays,
  };
}

export async function fetchCashflow(): Promise<CashflowResponse> {
  const r = await fetch('/reports/cashflow');
  if (!r.ok) throw new Error(`reports/cashflow returned ${r.status}`);
  return (await r.json()) as CashflowResponse;
}

export function useCashflow(refreshKey?: number) {
  const [data, setData] = useState<CashflowResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchCashflow();
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

  const kpis = computeCashflowKpis(data?.forecast || [], data?.weekly || [], data);

  return { data, kpis, loading, error, refetch: loadData };
}
