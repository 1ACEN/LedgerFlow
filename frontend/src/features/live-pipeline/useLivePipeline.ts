import { useState, useEffect, useCallback, useRef } from 'react';

export interface TodayStats {
  volume: number;
  total_usd: number;
  success_rate: number | null;
}

export interface LiveStatsResponse {
  total_transactions: number;
  today: TodayStats;
  last_ingested: string | null;
  by_source: Record<string, number>;
  timestamp?: string;
}

export interface LiveTransaction {
  transaction_id: string;
  occurred_at: string;
  type: string;
  status: string;
  source: string;
  amount_usd: number;
  net_amount_usd?: number;
  fee_amount_usd?: number;
  currency: string;
  product_line?: string;
  description?: string;
  decline_code?: string | null;
  ingested_at?: string;
}

export interface RecentTransactionsResponse {
  transactions: LiveTransaction[];
  count: number;
}

export interface ManualTransactionPayload {
  amount_usd: number;
  type: string;
  status: string;
  source: string;
  currency: string;
  product_line: string;
  account_code: string;
  description?: string;
  decline_code?: string;
}

export interface LivePipelineKpis {
  totalTransactions: number;
  todayVolume: number;
  todayTotalUsd: number;
  liveSuccessRate: number | null;
  lastIngested: string | null;
  bySource: Record<string, number>;
}

export function computeLiveKpis(stats: LiveStatsResponse | null): LivePipelineKpis {
  if (!stats) {
    return {
      totalTransactions: 0,
      todayVolume: 0,
      todayTotalUsd: 0,
      liveSuccessRate: null,
      lastIngested: null,
      bySource: {},
    };
  }

  return {
    totalTransactions: stats.total_transactions || 0,
    todayVolume: stats.today?.volume || 0,
    todayTotalUsd: stats.today?.total_usd || 0,
    liveSuccessRate: stats.today?.success_rate ?? null,
    lastIngested: stats.last_ingested || null,
    bySource: stats.by_source || {},
  };
}

export function formatTimeAgo(isoString: string | null): string {
  if (!isoString) return 'no events yet';
  const dt = new Date(isoString);
  if (isNaN(dt.getTime())) return '—';
  const diffSec = Math.floor((Date.now() - dt.getTime()) / 1000);
  if (diffSec < 5) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  return `${Math.floor(diffSec / 3600)}h ago`;
}

export function shortId(id: string): string {
  if (!id) return '—';
  return id.length > 18 ? `${id.slice(0, 8)}…${id.slice(-6)}` : id;
}

export function useLivePipeline(refreshKey?: number, pollingEnabled: boolean = true) {
  const [stats, setStats] = useState<LiveStatsResponse | null>(null);
  const [transactions, setTransactions] = useState<LiveTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string } | null>(null);

  const isInitialLoad = useRef(true);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/stats/live');
      if (!res.ok) throw new Error(`Live stats error (status ${res.status})`);
      const data: LiveStatsResponse = await res.json();
      setStats(data);
    } catch (err: unknown) {
      if (isInitialLoad.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch live stats');
      }
    }
  }, []);

  const fetchRecent = useCallback(async () => {
    try {
      const res = await fetch('/transactions/recent?limit=25');
      if (!res.ok) throw new Error(`Transactions error (status ${res.status})`);
      const data: RecentTransactionsResponse = await res.json();
      setTransactions(data.transactions || []);
    } catch (err: unknown) {
      if (isInitialLoad.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
      }
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchStats(), fetchRecent()]);
    setLoading(false);
    isInitialLoad.current = false;
  }, [fetchStats, fetchRecent]);

  // Initial fetch and on refreshKey trigger
  useEffect(() => {
    refreshAll();
  }, [refreshAll, refreshKey]);

  // Periodic polling every 3.5s when enabled
  useEffect(() => {
    if (!pollingEnabled) return;
    const interval = setInterval(() => {
      fetchStats();
      fetchRecent();
    }, 3500);

    return () => clearInterval(interval);
  }, [pollingEnabled, fetchStats, fetchRecent]);

  // Manual transaction submission
  const submitTransaction = async (payload: ManualTransactionPayload): Promise<boolean> => {
    setSubmitting(true);
    setSubmitResult(null);
    try {
      const res = await fetch('/transactions/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || `Server error (${res.status})`);
      }

      setSubmitResult({ success: true, message: 'Ingested successfully into DuckDB!' });
      await refreshAll();
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error';
      setSubmitResult({ success: false, message: `Submission failed: ${msg}` });
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const clearSubmitResult = () => setSubmitResult(null);

  const kpis = computeLiveKpis(stats);

  return {
    stats,
    kpis,
    transactions,
    loading,
    error,
    submitting,
    submitResult,
    submitTransaction,
    clearSubmitResult,
    refetch: refreshAll,
  };
}
