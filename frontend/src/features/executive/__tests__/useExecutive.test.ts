import { describe, it, expect } from 'vitest';
import { computeExecutiveKpis, ExecutiveReportResponse } from '../useExecutive';

describe('computeExecutiveKpis', () => {
  it('handles null or empty response gracefully with safe defaults', () => {
    const kpis = computeExecutiveKpis(null);
    expect(kpis.currentCash).toBe(0);
    expect(kpis.runwayDays).toBe(0);
    expect(kpis.dailyOutflow).toBe(0);
    expect(kpis.gatewaySuccessRate).toBe(0);
    expect(kpis.totalTransactions).toBe(0);
    expect(kpis.lastIngested).toBeNull();
    expect(kpis.net30dChange).toBe(0);
    expect(kpis.totalInflows30d).toBe(0);
    expect(kpis.totalOutflows30d).toBe(0);
    expect(kpis.runwayStatus).toBe('critical');
  });

  it('computes executive KPIs accurately from response payload', () => {
    const mockData: ExecutiveReportResponse = {
      current_cash: 25400120.5,
      runway_p50: 240,
      success_rate_24h: 98.4,
      net_burn_30d: 12500.25,
      total_transactions: 48920,
      last_ingested: '2026-09-12T10:30:00Z',
      cash_trend: [
        { date: '2026-08-01', cash: 24000000, net: 50000, inflows: 80000, outflows: 30000 },
        { date: '2026-08-02', cash: 24070000, net: 70000, inflows: 100000, outflows: 30000 },
        { date: '2026-08-03', cash: 25400120.5, net: 1330120.5, inflows: 1400000, outflows: 69879.5 },
      ],
    };

    const kpis = computeExecutiveKpis(mockData);
    expect(kpis.currentCash).toBe(25400120.5);
    expect(kpis.runwayDays).toBe(240);
    expect(kpis.runwayStatus).toBe('healthy');
    expect(kpis.dailyOutflow).toBe(12500.25);
    expect(kpis.gatewaySuccessRate).toBe(98.4);
    expect(kpis.totalTransactions).toBe(48920);
    expect(kpis.lastIngested).toBe('2026-09-12T10:30:00Z');

    // 30d change = 25400120.5 - 24000000 = 1400120.5
    expect(kpis.net30dChange).toBe(1400120.5);
    // Inflows sum = 80000 + 100000 + 1400000 = 1580000
    expect(kpis.totalInflows30d).toBe(1580000);
    // Outflows sum = 30000 + 30000 + 69879.5 = 129879.5
    expect(kpis.totalOutflows30d).toBe(129879.5);
  });

  it('classifies runway status thresholds correctly', () => {
    const base: ExecutiveReportResponse = {
      current_cash: 1000000,
      runway_p50: 180,
      success_rate_24h: 99,
      net_burn_30d: 5000,
      total_transactions: 1000,
      last_ingested: null,
      cash_trend: [],
    };

    expect(computeExecutiveKpis({ ...base, runway_p50: 200 }).runwayStatus).toBe('healthy');
    expect(computeExecutiveKpis({ ...base, runway_p50: 180 }).runwayStatus).toBe('healthy');
    expect(computeExecutiveKpis({ ...base, runway_p50: 120 }).runwayStatus).toBe('moderate');
    expect(computeExecutiveKpis({ ...base, runway_p50: 90 }).runwayStatus).toBe('moderate');
    expect(computeExecutiveKpis({ ...base, runway_p50: 60 }).runwayStatus).toBe('critical');
    expect(computeExecutiveKpis({ ...base, runway_p50: 0 }).runwayStatus).toBe('critical');
  });

  it('handles single trend point for net change', () => {
    const mockData: ExecutiveReportResponse = {
      current_cash: 500000,
      runway_p50: 100,
      success_rate_24h: 95,
      net_burn_30d: 2000,
      total_transactions: 500,
      last_ingested: null,
      cash_trend: [
        { date: '2026-08-01', cash: 500000, net: 25000, inflows: 35000, outflows: 10000 },
      ],
    };

    const kpis = computeExecutiveKpis(mockData);
    expect(kpis.net30dChange).toBe(25000);
  });
});
