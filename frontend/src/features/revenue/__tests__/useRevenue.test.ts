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

  describe('CFO Strategic Financial Intelligence computations', () => {
    it('integrates full strategic response payload with margins, budget, customer tiers, and capital structure', () => {
      const mockResponse = {
        financial_summary: {
          total_revenue_ttm: 6200000,
          net_revenue_ttm: 5900000,
          operating_expenses_ttm: 2400000,
          operating_income_ttm: 3500000,
          net_profit_ttm: 2975000,
          gross_margin_pct: 95.2,
          operating_margin_pct: 56.5,
          net_margin_pct: 48.0,
          mom_growth_pct: 12.5,
          cash_flow_net_30d: 115000,
        },
        revenue_by_customer_tier: [
          { tier: 'Enterprise Tier', plan_key: 'enterprise', customer_count: 195, total_revenue: 1750000, percentage: 28.2, transactions_count: 2900 },
          { tier: 'Professional Plan', plan_key: 'pro', customer_count: 395, total_revenue: 3750000, percentage: 60.5, transactions_count: 6000 },
        ],
        top_customers: [
          { name: 'Anderson-Sanders', tier: 'Enterprise Tier', country: 'PG', total_revenue: 27780, transactions_count: 23 },
        ],
        expenses_by_department: [
          { department: 'Engineering & R&D', key: 'engineering', amount_usd: 1200000, percentage: 50.0 },
          { department: 'Sales & AE', key: 'sales', amount_usd: 600000, percentage: 25.0 },
        ],
        budget_vs_actual: [
          { line_item: 'Gross Invoiced Revenue', category: 'Revenue', actual_usd: 6200000, budget_usd: 5800000, variance_usd: 400000, variance_pct: 6.9, status: 'favorable' as const },
        ],
        financial_performance_trends: [
          { month: '2026-10', gross_revenue: 550000, cogs: 25000, operating_expenses: 210000, operating_income: 315000, operating_margin_pct: 57.3 },
        ],
        forecasting: {
          q1_projected_revenue: 1650000,
          q1_projected_income: 940000,
          q2_projected_revenue: 1780000,
          q2_projected_income: 1010000,
          target_operating_margin_pct: 62.5,
          projected_cagr_pct: 14.2,
          confidence_interval: '95% Bayesian Posterior',
        },
        debt_capital_structure: {
          total_debt_usd: 1250000,
          total_equity_usd: 14500000,
          debt_to_equity_ratio: 0.09,
          interest_coverage_ratio: 16.4,
          quick_ratio: 4.8,
          credit_facility_capacity_usd: 5000000,
          capital_structure_status: 'Conservative / High Solvency',
        },
      };

      const kpis = computeRevenueKpis(sampleRows, mockResponse);
      expect(kpis.totalRevenue).toBe(6200000);
      expect(kpis.netProfit).toBe(2975000);
      expect(kpis.operatingMarginPct).toBe(56.5);
      expect(kpis.netMarginPct).toBe(48.0);
      expect(kpis.customerTiers).toHaveLength(2);
      expect(kpis.topCustomers).toHaveLength(1);
      expect(kpis.expensesByDept).toHaveLength(2);
      expect(kpis.budgetVsActual[0].status).toBe('favorable');
      expect(kpis.performanceTrends).toHaveLength(1);
      expect(kpis.debtStructure.debt_to_equity_ratio).toBe(0.09);
    });
  });
});
