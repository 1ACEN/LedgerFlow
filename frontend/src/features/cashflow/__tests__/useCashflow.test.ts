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
  });
});
