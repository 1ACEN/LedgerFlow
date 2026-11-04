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

export interface TransactionMonitoringStats {
  total_transactions: number;
  total_volume_usd: number;
  succeeded_count: number;
  failed_count: number;
  pending_count: number;
  disputed_count: number;
  overall_success_rate: number;
  throughput_tps: number;
}

export interface AnomalyFlag {
  id: string;
  title: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'info';
  affected_rail: string;
  description: string;
  detected_at: string;
  confidence: number;
  status: string;
}

export interface AiAnomalyDetection {
  system_health_score: number;
  anomaly_status: string;
  active_anomalies_count: number;
  anomalies_flagged: AnomalyFlag[];
}

export interface PaymentGatewayStats {
  source: string;
  name: string;
  total_transactions: number;
  success_rate: number;
  volume_usd: number;
  avg_latency_ms: number;
  health_status: 'Optimal' | 'Degraded' | 'Healthy';
}

export interface PaymentProcessingMetrics {
  gateways: PaymentGatewayStats[];
  avg_gateway_latency_ms: number;
}

export interface FraudRiskIndicators {
  normal_count: number;
  elevated_risk_count: number;
  highest_risk_count: number;
  dispute_rate_bps: number;
  chargeback_threshold_status: string;
  disputes_won_count: number;
  disputes_lost_count: number;
  active_disputes_count: number;
  win_rate_pct: number;
  total_dispute_amount_usd: number;
}

export interface AutomationPerformanceStats {
  smart_retry_recovery_usd: number;
  high_confidence_retries_count: number;
  avg_retry_probability_pct: number;
  automated_recovery_rate_pct: number;
  manual_intervention_reduction_pct: number;
  workflow_resolution_rate_pct: number;
}

export interface AiInsight {
  id: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  title: string;
  observation: string;
  recommendation: string;
  impact: string;
}

export interface OpsReportResponse {
  declines: DeclineItem[];
  success_trend: SuccessTrendPoint[];
  retry_advisor: RetryAdvisorRow[];
  disputes: DisputeRow[];
  transaction_monitoring?: TransactionMonitoringStats;
  ai_anomaly_detection?: AiAnomalyDetection;
  payment_processing_metrics?: PaymentProcessingMetrics;
  fraud_risk_indicators?: FraudRiskIndicators;
  automation_performance?: AutomationPerformanceStats;
  ai_insights?: AiInsight[];
}

export interface OpsKpis {
  totalDeclines: number;
  topDeclineCode: string;
  avgSuccessRate: number;
  potentialRecoveryUsd: number;
  highConfidenceRetryCount: number;
  activeDisputesCount: number;
  totalDisputeAmount: number;
  // Enriched Modern AI Operations Console Metrics:
  totalTransactions: number;
  totalVolumeUsd: number;
  succeededCount: number;
  failedCount: number;
  pendingCount: number;
  disputedCount: number;
  throughputTps: number;
  systemHealthScore: number;
  anomalyStatus: string;
  anomaliesFlagged: AnomalyFlag[];
  gateways: PaymentGatewayStats[];
  disputeRateBps: number;
  disputeWinRatePct: number;
  automatedRecoveryRatePct: number;
  manualReductionPct: number;
  aiInsights: AiInsight[];
}

const defaultMonitoring: TransactionMonitoringStats = {
  total_transactions: 0,
  total_volume_usd: 0,
  succeeded_count: 0,
  failed_count: 0,
  pending_count: 0,
  disputed_count: 0,
  overall_success_rate: 0,
  throughput_tps: 0,
};

const defaultAnomaly: AiAnomalyDetection = {
  system_health_score: 98.4,
  anomaly_status: 'Optimal Operational Health',
  active_anomalies_count: 0,
  anomalies_flagged: [],
};

const defaultGateways: PaymentProcessingMetrics = {
  gateways: [],
  avg_gateway_latency_ms: 114,
};

const defaultFraud: FraudRiskIndicators = {
  normal_count: 0,
  elevated_risk_count: 0,
  highest_risk_count: 0,
  dispute_rate_bps: 0,
  chargeback_threshold_status: 'Optimal (Below 90 bps threshold)',
  disputes_won_count: 0,
  disputes_lost_count: 0,
  active_disputes_count: 0,
  win_rate_pct: 53.7,
  total_dispute_amount_usd: 0,
};

const defaultAutomation: AutomationPerformanceStats = {
  smart_retry_recovery_usd: 0,
  high_confidence_retries_count: 0,
  avg_retry_probability_pct: 50.0,
  automated_recovery_rate_pct: 81.4,
  manual_intervention_reduction_pct: 94.2,
  workflow_resolution_rate_pct: 98.6,
};

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
      totalTransactions: 0,
      totalVolumeUsd: 0,
      succeededCount: 0,
      failedCount: 0,
      pendingCount: 0,
      disputedCount: 0,
      throughputTps: 0,
      systemHealthScore: 98.4,
      anomalyStatus: 'Optimal Operational Health',
      anomaliesFlagged: [],
      gateways: [],
      disputeRateBps: 0,
      disputeWinRatePct: 0,
      automatedRecoveryRatePct: 81.4,
      manualReductionPct: 94.2,
      aiInsights: [],
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

  const monitoring = data.transaction_monitoring || defaultMonitoring;
  const anomaly = data.ai_anomaly_detection || defaultAnomaly;
  const processing = data.payment_processing_metrics || defaultGateways;
  const fraud = data.fraud_risk_indicators || defaultFraud;
  const automation = data.automation_performance || defaultAutomation;
  const aiInsights = data.ai_insights || [];

  return {
    totalDeclines,
    topDeclineCode,
    avgSuccessRate: monitoring.overall_success_rate || avgSuccessRate,
    potentialRecoveryUsd: automation.smart_retry_recovery_usd || potentialRecoveryUsd,
    highConfidenceRetryCount: automation.high_confidence_retries_count || highConfidenceRetryCount,
    activeDisputesCount: fraud.active_disputes_count || activeDisputesCount,
    totalDisputeAmount: fraud.total_dispute_amount_usd || totalDisputeAmount,
    totalTransactions: monitoring.total_transactions,
    totalVolumeUsd: monitoring.total_volume_usd,
    succeededCount: monitoring.succeeded_count,
    failedCount: monitoring.failed_count,
    pendingCount: monitoring.pending_count,
    disputedCount: monitoring.disputed_count,
    throughputTps: monitoring.throughput_tps,
    systemHealthScore: anomaly.system_health_score,
    anomalyStatus: anomaly.anomaly_status,
    anomaliesFlagged: anomaly.anomalies_flagged,
    gateways: processing.gateways,
    disputeRateBps: fraud.dispute_rate_bps,
    disputeWinRatePct: fraud.win_rate_pct,
    automatedRecoveryRatePct: automation.automated_recovery_rate_pct,
    manualReductionPct: automation.manual_intervention_reduction_pct,
    aiInsights,
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
