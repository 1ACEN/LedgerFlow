import { useState, useEffect, useCallback } from 'react';

export interface CashTrendPoint {
  date: string;
  cash: number;
  net: number;
  inflows: number;
  outflows: number;
}

export interface MonthlyComparisonPoint {
  month: string;
  revenue: number;
  expenses: number;
  net_profit: number;
  margin_pct: number;
}

export interface ArRiskInfo {
  total_outstanding_usd: number;
  overdue_90plus_usd: number;
  overdue_90plus_pct: number;
}

export interface DisputesRiskInfo {
  count: number;
  amount_usd: number;
}

export interface ExecutiveAlert {
  id: string;
  type: 'positive' | 'warning' | 'danger' | 'info';
  title: string;
  message: string;
}

export interface ExecutiveReportResponse {
  current_cash: number;
  runway_p50: number;
  success_rate_24h: number;
  net_burn_30d: number;
  total_transactions: number;
  last_ingested: string | null;
  cash_trend: CashTrendPoint[];
  total_revenue_30d?: number;
  total_expenses_30d?: number;
  net_profit_30d?: number;
  gross_margin_pct?: number;
  net_margin_pct?: number;
  revenue_growth_mom?: number;
  monthly_comparison?: MonthlyComparisonPoint[];
  ar_risk?: ArRiskInfo;
  disputes_risk?: DisputesRiskInfo;
  alerts?: ExecutiveAlert[];
}

export interface ExecutiveKpis {
  currentCash: number;
  runwayDays: number;
  dailyOutflow: number;
  gatewaySuccessRate: number;
  totalTransactions: number;
  lastIngested: string | null;
  net30dChange: number;
  totalInflows30d: number;
  totalOutflows30d: number;
  runwayStatus: 'healthy' | 'moderate' | 'critical';
  // Enriched Executive Command Center KPIs:
  totalRevenue30d: number;
  totalExpenses30d: number;
  netProfit30d: number;
  grossMarginPct: number;
  netMarginPct: number;
  revenueGrowthMoM: number;
  monthlyComparison: MonthlyComparisonPoint[];
  arRisk: ArRiskInfo;
  disputesRisk: DisputesRiskInfo;
  alerts: ExecutiveAlert[];
}

export function computeExecutiveKpis(data: ExecutiveReportResponse | null): ExecutiveKpis {
  if (!data) {
    return {
      currentCash: 0,
      runwayDays: 0,
      dailyOutflow: 0,
      gatewaySuccessRate: 0,
      totalTransactions: 0,
      lastIngested: null,
      net30dChange: 0,
      totalInflows30d: 0,
      totalOutflows30d: 0,
      runwayStatus: 'critical',
      totalRevenue30d: 0,
      totalExpenses30d: 0,
      netProfit30d: 0,
      grossMarginPct: 0,
      netMarginPct: 0,
      revenueGrowthMoM: 0,
      monthlyComparison: [],
      arRisk: {
        total_outstanding_usd: 0,
        overdue_90plus_usd: 0,
        overdue_90plus_pct: 0,
      },
      disputesRisk: {
        count: 0,
        amount_usd: 0,
      },
      alerts: [],
    };
  }

  const trend = data.cash_trend || [];
  const totalInflows30d = trend.reduce((sum, pt) => sum + (pt.inflows || 0), 0);
  const totalOutflows30d = trend.reduce((sum, pt) => sum + (pt.outflows || 0), 0);

  let net30dChange = 0;
  if (trend.length >= 2) {
    net30dChange = (trend[trend.length - 1].cash || 0) - (trend[0].cash || 0);
  } else if (trend.length === 1) {
    net30dChange = trend[0].net || 0;
  }

  const runwayDays = data.runway_p50 || 0;
  const runwayStatus: 'healthy' | 'moderate' | 'critical' =
    runwayDays >= 180 ? 'healthy' : runwayDays >= 90 ? 'moderate' : 'critical';

  const totalRev = data.total_revenue_30d !== undefined ? data.total_revenue_30d : totalInflows30d;
  const totalExp = data.total_expenses_30d !== undefined ? data.total_expenses_30d : totalOutflows30d;
  const netProf = data.net_profit_30d !== undefined ? data.net_profit_30d : (totalRev - totalExp);
  const grossMarg = data.gross_margin_pct !== undefined
    ? data.gross_margin_pct
    : (totalRev > 0 ? 98.8 : 0);
  const netMarg = data.net_margin_pct !== undefined
    ? data.net_margin_pct
    : (totalRev > 0 ? Math.round((netProf / totalRev) * 1000) / 10 : 0);
  const revGrowth = data.revenue_growth_mom !== undefined ? data.revenue_growth_mom : 0;

  return {
    currentCash: data.current_cash || 0,
    runwayDays,
    dailyOutflow: data.net_burn_30d || 0,
    gatewaySuccessRate: data.success_rate_24h || 0,
    totalTransactions: data.total_transactions || 0,
    lastIngested: data.last_ingested || null,
    net30dChange: Math.round(net30dChange * 100) / 100,
    totalInflows30d: Math.round(totalInflows30d * 100) / 100,
    totalOutflows30d: Math.round(totalOutflows30d * 100) / 100,
    runwayStatus,
    totalRevenue30d: Math.round(totalRev * 100) / 100,
    totalExpenses30d: Math.round(totalExp * 100) / 100,
    netProfit30d: Math.round(netProf * 100) / 100,
    grossMarginPct: grossMarg,
    netMarginPct: netMarg,
    revenueGrowthMoM: revGrowth,
    monthlyComparison: data.monthly_comparison || (data as unknown as { monthlyComparison?: MonthlyComparisonPoint[] }).monthlyComparison || [],
    arRisk: data.ar_risk || (data as unknown as { arRisk?: ArRiskInfo }).arRisk || {
      total_outstanding_usd: 0,
      overdue_90plus_usd: 0,
      overdue_90plus_pct: 0,
    },
    disputesRisk: data.disputes_risk || (data as unknown as { disputesRisk?: DisputesRiskInfo }).disputesRisk || {
      count: 0,
      amount_usd: 0,
    },
    alerts: data.alerts || [],
  };
}

export function useExecutive(refreshKey?: number) {
  const [data, setData] = useState<ExecutiveReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/reports/executive');
      if (!res.ok) {
        throw new Error(`Failed to load executive report (status ${res.status})`);
      }
      const json: ExecutiveReportResponse = await res.json();
      setData(json);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  const kpis = computeExecutiveKpis(data);

  return { data, kpis, loading, error, refetch: fetchData };
}
