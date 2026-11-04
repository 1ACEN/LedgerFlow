import { describe, it, expect } from 'vitest';
import {
  computeCashflowKpis,
  type ForecastPoint,
  type WeeklyFlow,
} from '../useCashflow';

const sampleForecast: ForecastPoint[] = [
  {
    date: '2026-09-15',
    p10: 120000,
    p50: 150000,
    p90: 180000,
    inflows: 20000,
    outflows: 15000,
  },
  {
    date: '2026-09-22',
    p10: 125000,
    p50: 160000,
    p90: 195000,
    inflows: 22000,
    outflows: 14000,
  },
  {
    date: '2026-09-29',
    p10: 130000,
    p50: 175000,
    p90: 215000,
    inflows: 25000,
    outflows: 16000,
  },
];

const sampleWeekly: WeeklyFlow[] = [
  { week: '2026-08-10', inflows: 40000, outflows: 30000, net: 10000 },
  { week: '2026-08-17', inflows: 35000, outflows: 42000, net: -7000 },
  { week: '2026-08-24', inflows: 50000, outflows: 38000, net: 12000 },
  { week: '2026-08-31', inflows: 45000, outflows: 40000, net: 5000 },
];

describe('useCashflow logic', () => {
  describe('computeCashflowKpis', () => {
    it('handles empty inputs gracefully', () => {
      const k = computeCashflowKpis([], []);
      expect(k.projectedEndingCash).toBe(0);
      expect(k.confidenceSpread).toBe(0);
      expect(k.historical12wNet).toBe(0);
      expect(k.avgWeeklyNet).toBe(0);
    });

    it('derives projected ending cash and spread from the latest forecast point', () => {
      const k = computeCashflowKpis(sampleForecast, []);
      // Latest is week 3: p50 = 175000, p90 = 215000, p10 = 130000
      expect(k.projectedEndingCash).toBe(175000);
      // Spread = 215000 - 130000 = 85000
      expect(k.confidenceSpread).toBe(85000);
    });

    it('computes historical total net and average weekly net flow', () => {
      const k = computeCashflowKpis([], sampleWeekly);
      // Net: 10000 - 7000 + 12000 + 5000 = 20000
      expect(k.historical12wNet).toBe(20000);
      // Avg: 20000 / 4 = 5000
      expect(k.avgWeeklyNet).toBe(5000);
    });

    it('combines forecast and weekly metrics accurately', () => {
      const k = computeCashflowKpis(sampleForecast, sampleWeekly);
      expect(k.projectedEndingCash).toBe(175000);
      expect(k.confidenceSpread).toBe(85000);
      expect(k.historical12wNet).toBe(20000);
      expect(k.avgWeeklyNet).toBe(5000);
    });

    it('computes enriched Analytical Data Intelligence metrics, breakdowns, and scenarios', () => {
      const mockResponse = {
        current_cash_reserves: 7200000,
        net_cash_flow_30d: 115000,
        inflows_30d: 550000,
        outflows_30d: 435000,
        operating_cash_flow_30d: 520000,
        free_cash_flow_30d: 260000,
        inflows_breakdown: [
          { category: 'Subscriptions', amount: 220000, percentage: 40.0 },
          { category: 'Platform Fees', amount: 330000, percentage: 60.0 },
        ],
        outflows_breakdown: [
          { category: 'Vendor Payouts', amount: 250000, percentage: 57.5 },
          { category: 'Processing Fees', amount: 185000, percentage: 42.5 },
        ],
        monthly_trends: [
          { period: '2026-10', inflows: 250000, outflows: 140000, net_flow: 110000, ending_cash: 7300000 },
        ],
        quarterly_trends: [
          { period: '2026-Q4', inflows: 540000, outflows: 520000, net_flow: 20000, ending_cash: 7200000 },
        ],
        actual_history_30d: [
          { date: '2026-10-01', inflows: 10000, outflows: 8000, net: 2000, cash: 7200000 },
        ],
        scenarios: {
          worst_case: {
            label: 'Worst-Case (P10)',
            description: 'Stress test',
            runway_days: 180,
            ending_cash_90d: 1450000,
            net_change_90d: 80000,
            daily_burn_or_growth: 888,
          },
          base_case: {
            label: 'Base-Case (P50)',
            description: 'Expected median',
            runway_days: 365,
            ending_cash_90d: 1580000,
            net_change_90d: 210000,
            daily_burn_or_growth: 2333,
          },
          best_case: {
            label: 'Best-Case (P90)',
            description: 'Optimistic growth',
            runway_days: 365,
            ending_cash_90d: 1650000,
            net_change_90d: 280000,
            daily_burn_or_growth: 3111,
          },
        },
      };

      const k = computeCashflowKpis(sampleForecast, sampleWeekly, mockResponse);
      expect(k.currentReserves).toBe(7200000);
      expect(k.netCashFlow30d).toBe(115000);
      expect(k.operatingCashFlow30d).toBe(520000);
      expect(k.freeCashFlow30d).toBe(260000);
      expect(k.inflowsBreakdown).toHaveLength(2);
      expect(k.outflowsBreakdown).toHaveLength(2);
      expect(k.monthlyTrends).toHaveLength(1);
      expect(k.quarterlyTrends).toHaveLength(1);
      expect(k.actualHistory30d).toHaveLength(1);
      expect(k.scenarios.worst_case.runway_days).toBe(180);
      expect(k.p10RunwayDays).toBe(180);
      expect(k.p50RunwayDays).toBe(365);
      expect(k.p90RunwayDays).toBe(365);
    });
  });
});
