import { describe, it, expect } from 'vitest';
import { computeOpsKpis, OpsReportResponse } from '../useOps';

describe('computeOpsKpis', () => {
  it('handles null response safely with default values', () => {
    const kpis = computeOpsKpis(null);
    expect(kpis.totalDeclines).toBe(0);
    expect(kpis.topDeclineCode).toBe('None');
    expect(kpis.avgSuccessRate).toBe(0);
    expect(kpis.potentialRecoveryUsd).toBe(0);
    expect(kpis.highConfidenceRetryCount).toBe(0);
    expect(kpis.activeDisputesCount).toBe(0);
    expect(kpis.totalDisputeAmount).toBe(0);
  });

  it('computes correct KPIs from realistic ops data', () => {
    const mockData: OpsReportResponse = {
      declines: [
        { code: 'insufficient_funds', count: 120 },
        { code: 'do_not_honor', count: 80 },
        { code: 'card_velocity_exceeded', count: 30 },
      ],
      success_trend: [
        { date: '2026-09-01', source: 'stripe', rate: 98.2 },
        { date: '2026-09-01', source: 'plaid', rate: 95.0 },
        { date: '2026-09-02', source: 'stripe', rate: 97.4 },
        { date: '2026-09-02', source: 'plaid', rate: 96.2 },
      ],
      retry_advisor: [
        {
          transaction_id: 'txn_01',
          decline_code: 'insufficient_funds',
          brand: 'Visa',
          funding: 'credit',
          amount_usd: 150.0,
          probability: 78.5,
          action: 'retry_in_24h',
          recovery_usd: 117.75,
        },
        {
          transaction_id: 'txn_02',
          decline_code: 'generic_decline',
          brand: 'Mastercard',
          funding: 'debit',
          amount_usd: 80.0,
          probability: 32.0,
          action: 'request_alternate_payment',
          recovery_usd: 25.6,
        },
        {
          transaction_id: 'txn_03',
          decline_code: 'expired_card',
          brand: 'Visa',
          funding: 'credit',
          amount_usd: 200.0,
          probability: 85.0,
          action: 'card_updater',
          recovery_usd: 170.0,
        },
      ],
      disputes: [
        {
          dispute_id: 'dp_01',
          transaction_id: 'txn_10',
          customer_id: 'cus_01',
          amount_usd: 350.0,
          status: 'warning_needs_response',
          created_at: '2026-08-20',
          due_by: '2026-09-20',
        },
        {
          dispute_id: 'dp_02',
          transaction_id: 'txn_11',
          customer_id: 'cus_02',
          amount_usd: 125.5,
          status: 'under_review',
          created_at: '2026-08-22',
          due_by: '2026-09-22',
        },
      ],
    };

    const kpis = computeOpsKpis(mockData);

    // Total declines = 120 + 80 + 30 = 230
    expect(kpis.totalDeclines).toBe(230);
    expect(kpis.topDeclineCode).toBe('insufficient funds');

    // Avg success rate = (98.2 + 95.0 + 97.4 + 96.2) / 4 = 386.8 / 4 = 96.7
    expect(kpis.avgSuccessRate).toBe(96.7);

    // Potential recovery = 117.75 + 25.6 + 170 = 313.35
    expect(kpis.potentialRecoveryUsd).toBe(313.35);
    // Probabilities >= 70%: 78.5% and 85.0% -> 2
    expect(kpis.highConfidenceRetryCount).toBe(2);

    // Disputes count = 2, sum = 350 + 125.5 = 475.5
    expect(kpis.activeDisputesCount).toBe(2);
    expect(kpis.totalDisputeAmount).toBe(475.5);
  });

  it('computes enriched Modern AI Operations Console metrics accurately', () => {
    const mockData: OpsReportResponse = {
      declines: [],
      success_trend: [],
      retry_advisor: [],
      disputes: [],
      transaction_monitoring: {
        total_transactions: 52721,
        total_volume_usd: 29761711,
        succeeded_count: 49442,
        failed_count: 2100,
        pending_count: 789,
        disputed_count: 322,
        overall_success_rate: 93.8,
        throughput_tps: 42.8,
      },
      ai_anomaly_detection: {
        system_health_score: 98.4,
        anomaly_status: 'Optimal Operational Health',
        active_anomalies_count: 3,
        anomalies_flagged: [
          {
            id: 'anom_01',
            title: 'High-Frequency Velocity Anomaly',
            type: 'Velocity Variance',
            severity: 'medium',
            affected_rail: 'Adyen Global Rail',
            description: '14 micro-charges flagged',
            detected_at: '12m ago',
            confidence: 94.2,
            status: 'Contained',
          },
        ],
      },
      payment_processing_metrics: {
        gateways: [
          {
            source: 'stripe',
            name: 'Stripe Connect',
            total_transactions: 26604,
            success_rate: 93.6,
            volume_usd: 15173571,
            avg_latency_ms: 142,
            health_status: 'Optimal',
          },
        ],
        avg_gateway_latency_ms: 114,
      },
      fraud_risk_indicators: {
        normal_count: 51024,
        elevated_risk_count: 1031,
        highest_risk_count: 666,
        dispute_rate_bps: 65.1,
        chargeback_threshold_status: 'Optimal',
        disputes_won_count: 80,
        disputes_lost_count: 69,
        active_disputes_count: 173,
        win_rate_pct: 53.7,
        total_dispute_amount_usd: 210444,
      },
      automation_performance: {
        smart_retry_recovery_usd: 14174.8,
        high_confidence_retries_count: 5,
        avg_retry_probability_pct: 50.6,
        automated_recovery_rate_pct: 81.4,
        manual_intervention_reduction_pct: 94.2,
        workflow_resolution_rate_pct: 98.6,
      },
      ai_insights: [
        {
          id: 'ins_01',
          priority: 'high',
          category: 'Smart Routing',
          title: 'Dynamic Rail Optimization',
          observation: 'Plaid Instant ACH shows 94% auth rate',
          recommendation: 'Route high value B2B invoices to Plaid',
          impact: '$48,200 annual interchange fee savings',
        },
      ],
    };

    const kpis = computeOpsKpis(mockData);
    expect(kpis.totalTransactions).toBe(52721);
    expect(kpis.avgSuccessRate).toBe(93.8);
    expect(kpis.systemHealthScore).toBe(98.4);
    expect(kpis.anomaliesFlagged).toHaveLength(1);
    expect(kpis.gateways).toHaveLength(1);
    expect(kpis.disputeRateBps).toBe(65.1);
    expect(kpis.disputeWinRatePct).toBe(53.7);
    expect(kpis.automatedRecoveryRatePct).toBe(81.4);
    expect(kpis.aiInsights).toHaveLength(1);
  });

  it('handles empty arrays without division by zero errors', () => {
    const emptyData: OpsReportResponse = {
      declines: [],
      success_trend: [],
      retry_advisor: [],
      disputes: [],
    };

    const kpis = computeOpsKpis(emptyData);
    expect(kpis.totalDeclines).toBe(0);
    expect(kpis.topDeclineCode).toBe('None');
    expect(kpis.avgSuccessRate).toBe(0);
    expect(kpis.potentialRecoveryUsd).toBe(0);
    expect(kpis.highConfidenceRetryCount).toBe(0);
    expect(kpis.activeDisputesCount).toBe(0);
    expect(kpis.totalDisputeAmount).toBe(0);
  });
});
