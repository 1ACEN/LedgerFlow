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
