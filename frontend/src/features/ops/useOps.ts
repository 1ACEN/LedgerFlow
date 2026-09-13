import { useState, useEffect, useCallback } from 'react';

export interface DeclineItem {
  code: string;
  count: number;
}

export interface SuccessTrendPoint {
  date: string;
  source: string;
  rate: number;
}

export interface RetryAdvisorRow {
  transaction_id: string;
  decline_code: string;
  brand: string;
  funding: string;
  amount_usd: number;
  probability: number;
  action: string;
  recovery_usd: number;
}

export interface DisputeRow {
  dispute_id: string;
  transaction_id: string;
  customer_id: string;
  amount_usd: number;
  status: string;
  created_at: string | null;
  due_by: string | null;
}

export interface OpsReportResponse {
  declines: DeclineItem[];
  success_trend: SuccessTrendPoint[];
  retry_advisor: RetryAdvisorRow[];
  disputes: DisputeRow[];
}

export interface OpsKpis {
  totalDeclines: number;
  topDeclineCode: string;
  avgSuccessRate: number;
  potentialRecoveryUsd: number;
  highConfidenceRetryCount: number;
  activeDisputesCount: number;
  totalDisputeAmount: number;
}

export function computeOpsKpis(data: OpsReportResponse | null): OpsKpis {
  if (!data) {
    return {
      totalDeclines: 0,
      topDeclineCode: 'None',
      avgSuccessRate: 0,
      potentialRecoveryUsd: 0,
      highConfidenceRetryCount: 0,
      activeDisputesCount: 0,
      totalDisputeAmount: 0,
    };
  }

  const declines = data.declines || [];
  const totalDeclines = declines.reduce((sum, d) => sum + (d.count || 0), 0);
  const topDeclineCode = declines.length > 0 ? (declines[0].code || 'None').replace(/_/g, ' ') : 'None';

  const trend = data.success_trend || [];
  let avgSuccessRate = 0;
  if (trend.length > 0) {
    const sumRate = trend.reduce((sum, t) => sum + (t.rate || 0), 0);
    avgSuccessRate = Math.round((sumRate / trend.length) * 10) / 10;
  }

  const retries = data.retry_advisor || [];
  const potentialRecoveryUsd = Math.round(
    retries.reduce((sum, r) => sum + (r.recovery_usd || 0), 0) * 100
  ) / 100;
  const highConfidenceRetryCount = retries.filter(r => (r.probability || 0) >= 70).length;

  const disputes = data.disputes || [];
  const activeDisputesCount = disputes.length;
  const totalDisputeAmount = Math.round(
    disputes.reduce((sum, dp) => sum + (dp.amount_usd || 0), 0) * 100
  ) / 100;

  return {
    totalDeclines,
    topDeclineCode,
    avgSuccessRate,
    potentialRecoveryUsd,
    highConfidenceRetryCount,
    activeDisputesCount,
    totalDisputeAmount,
  };
}

export function useOps(refreshKey?: number) {
  const [data, setData] = useState<OpsReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/reports/ops');
      if (!res.ok) {
        throw new Error(`Failed to load ops report (status ${res.status})`);
      }
      const json: OpsReportResponse = await res.json();
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

  const kpis = computeOpsKpis(data);

  return { data, kpis, loading, error, refetch: fetchData };
}
