import { useState, useEffect, useCallback } from 'react';

export interface CashTrendPoint {
  date: string;
  cash: number;
  net: number;
  inflows: number;
  outflows: number;
}

export interface ExecutiveReportResponse {
  current_cash: number;
  runway_p50: number;
  success_rate_24h: number;
  net_burn_30d: number;
  total_transactions: number;
  last_ingested: string | null;
  cash_trend: CashTrendPoint[];
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
