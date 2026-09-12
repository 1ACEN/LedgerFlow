import { describe, it, expect } from 'vitest';
import {
  computeRevenueKpis,
  computeMoMGrowth,
  computeProductTotals,
  groupIncomeStatement,
  formatProductLine,
  type RevenueRow,
} from '../useRevenue';

const sampleRows: RevenueRow[] = [
  { month: '2024-01-01', product_line: 'subscriptions', revenue: 10000, net_revenue: 9700 },
  { month: '2024-01-01', product_line: 'ecommerce', revenue: 5000, net_revenue: 4850 },
  { month: '2024-02-01', product_line: 'subscriptions', revenue: 12000, net_revenue: 11640 },
  { month: '2024-02-01', product_line: 'ecommerce', revenue: 6000, net_revenue: 5820 },
  { month: '2024-03-01', product_line: 'subscriptions', revenue: 15000, net_revenue: 14550 },
  { month: '2024-03-01', product_line: 'ecommerce', revenue: 9000, net_revenue: 8730 },
];

describe('useRevenue logic', () => {
  describe('formatProductLine', () => {
    it('converts snake_case to Title Case words', () => {
      expect(formatProductLine('professional_services')).toBe('Professional Services');
      expect(formatProductLine('platform_fees')).toBe('Platform Fees');
      expect(formatProductLine('subscriptions')).toBe('Subscriptions');
    });
  });

  describe('computeRevenueKpis', () => {
    it('handles empty rows gracefully', () => {
      const kpis = computeRevenueKpis([]);
      expect(kpis.totalRevenue).toBe(0);
      expect(kpis.netRevenue).toBe(0);
      expect(kpis.grossMarginPct).toBe(0);
      expect(kpis.momGrowth).toBe(0);
    });

    it('calculates total, net, margin, and latest MoM growth correctly', () => {
      const kpis = computeRevenueKpis(sampleRows);
      // Jan: 15000, Feb: 18000, Mar: 24000
      // Total: 15000 + 18000 + 24000 = 57000
      expect(kpis.totalRevenue).toBe(57000);
      // Net: (9700+4850) + (11640+5820) + (14550+8730) = 14550 + 17460 + 23280 = 55290
      expect(kpis.netRevenue).toBe(55290);
      // Margin: 55290 / 57000 = 97%
      expect(kpis.grossMarginPct).toBe(97);
      // Latest MoM: (Mar 24000 - Feb 18000) / Feb 18000 = 6000 / 18000 = 33%
      expect(kpis.momGrowth).toBe(33);
    });

    it('handles single month rows with 0 MoM growth', () => {
      const singleMonth: RevenueRow[] = [
        { month: '2024-01-01', product_line: 'subscriptions', revenue: 10000, net_revenue: 9700 },
      ];
      const kpis = computeRevenueKpis(singleMonth);
      expect(kpis.totalRevenue).toBe(10000);
      expect(kpis.momGrowth).toBe(0);
    });
  });

  describe('computeMoMGrowth', () => {
    it('computes chronological monthly totals and MoM percent change', () => {
      const result = computeMoMGrowth(sampleRows);
      expect(result.months).toEqual(['2024-01-01', '2024-02-01', '2024-03-01']);
      expect(result.totals).toEqual([15000, 18000, 24000]);
      // Jan: null, Feb: (18000 - 15000) / 15000 = 20%, Mar: (24000 - 18000) / 18000 = 33%
      expect(result.momGrowth).toEqual([null, 20, 33]);
    });
  });

  describe('computeProductTotals', () => {
    it('aggregates across months and sorts descending by revenue', () => {
      const products = computeProductTotals(sampleRows);
      expect(products).toHaveLength(2);
      // Subscriptions: 10000 + 12000 + 15000 = 37000
      expect(products[0].productLine).toBe('subscriptions');
      expect(products[0].total).toBe(37000);
      expect(products[0].label).toBe('Subscriptions');
      // Ecommerce: 5000 + 6000 + 9000 = 20000
      expect(products[1].productLine).toBe('ecommerce');
      expect(products[1].total).toBe(20000);
      expect(products[1].label).toBe('Ecommerce');
    });
  });

  describe('groupIncomeStatement', () => {
    it('groups rows by month in reverse chronological order with subtotals', () => {
      const groups = groupIncomeStatement(sampleRows);
      expect(groups).toHaveLength(3);
      // Reverse order: March first
      expect(groups[0].month).toBe('2024-03-01');
      expect(groups[0].gross).toBe(24000);
      expect(groups[0].net).toBe(23280);
      expect(groups[0].rows).toHaveLength(2);

      // January last
      expect(groups[2].month).toBe('2024-01-01');
      expect(groups[2].gross).toBe(15000);
      expect(groups[2].net).toBe(14550);
    });
  });
});
