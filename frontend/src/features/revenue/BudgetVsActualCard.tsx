import { fmt_usd } from '../../lib/api';
import type { BudgetItem } from './useRevenue';

interface BudgetVsActualCardProps {
  items: BudgetItem[];
}

export const BudgetVsActualCard = ({ items }: BudgetVsActualCardProps) => {
  const revenueItem = items.find((i) => i.category === 'Revenue');
  const opexItems = items.filter((i) => i.category === 'Operating Expenses');
  const totalActualOpex = opexItems.reduce((s, i) => s + i.actual_usd, 0);
  const totalBudgetOpex = opexItems.reduce((s, i) => s + i.budget_usd, 0);
  const opexVariance = totalBudgetOpex - totalActualOpex; // positive means under budget (favorable)

  return (
    <div className="card animate-in stagger-2" style={{ height: '100%' }}>
      <div
        className="card-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <span className="card-title">Budget vs. Actual Performance</span>
          <span className="card-subtitle" style={{ display: 'block' }}>
            Variance analysis across top-line targets, direct costs, and departmental operating expense budgets
          </span>
        </div>

        {/* Quick Variance Indicators */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {revenueItem && (
            <span
              className={`badge-pill ${revenueItem.status === 'favorable' ? 'high' : 'low'}`}
              style={{ fontSize: 10 }}
            >
              Revenue: {revenueItem.variance_pct > 0 ? '+' : ''}{revenueItem.variance_pct}% {revenueItem.status}
            </span>
          )}
          <span
            className={`badge-pill ${opexVariance >= 0 ? 'high' : 'med'}`}
            style={{ fontSize: 10 }}
          >
            OpEx: {opexVariance >= 0 ? 'Under Budget' : 'Over Budget'} ({fmt_usd(Math.abs(opexVariance))})
          </span>
        </div>
      </div>

      <div className="card-body" style={{ padding: 0 }}>
        <div className="table-container" style={{ maxHeight: 380 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ minWidth: 160 }}>Line Item</th>
                <th>Category</th>
                <th style={{ textAlign: 'right' }}>Actual (USD)</th>
                <th style={{ textAlign: 'right' }}>Budget (USD)</th>
                <th style={{ textAlign: 'right' }}>Variance (USD)</th>
                <th style={{ textAlign: 'right' }}>Var %</th>
                <th style={{ textAlign: 'center', width: 110 }}>Performance</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty-state">
                    <div className="empty-state-title">No budget variance line items found</div>
                  </td>
                </tr>
              ) : (
                items.map((row, idx) => {
                  const isFav = row.status === 'favorable';
                  return (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {row.line_item}
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 11.5 }}>
                        {row.category}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                        {fmt_usd(row.actual_usd)}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                        {fmt_usd(row.budget_usd)}
                      </td>
                      <td
                        style={{
                          textAlign: 'right',
                          fontWeight: 700,
                          color: isFav ? 'var(--green)' : 'var(--red)',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {row.variance_usd >= 0 ? '+' : ''}{fmt_usd(row.variance_usd)}
                      </td>
                      <td
                        style={{
                          textAlign: 'right',
                          fontWeight: 600,
                          color: isFav ? 'var(--green)' : 'var(--red)',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {row.variance_pct >= 0 ? '+' : ''}{row.variance_pct}%
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span
                          className={`badge-pill ${isFav ? 'high' : 'low'}`}
                          style={{ fontSize: 10, textTransform: 'capitalize' }}
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

