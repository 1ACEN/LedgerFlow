import React, { useMemo } from 'react';
import type { CashTrendPoint } from './useExecutive';
import { useCrossFilter } from '../../lib/CrossFilterContext';

interface ExecutiveFlowsTableProps {
  trend: CashTrendPoint[];
  style?: React.CSSProperties;
}

function fmtUsd(v: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(v);
}

export const ExecutiveFlowsTable: React.FC<ExecutiveFlowsTableProps> = ({ trend, style }) => {
  const { filters, toggleFilter } = useCrossFilter();

  // Present rows in reverse chronological order (newest date first)
  const rows = useMemo(() => {
    let result = [...trend].reverse();
    if (filters.date) {
      result = result.filter((r) => r.date === filters.date);
    } else if (filters.month) {
      const filtered = result.filter((r) => r.date.startsWith(filters.month!));
      if (filtered.length > 0) result = filtered;
    }
    return result;
  }, [trend, filters.date, filters.month]);

  return (
    <div className="card animate-in stagger-4" style={{ marginTop: 0, ...style }}>
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
          <span className="card-title">30-Day Liquidity &amp; Cash Flow Ledger</span>
          <span className="card-subtitle" style={{ display: 'block' }}>
            Daily audited inflows, outflows, net change, and close-of-day cash balance (Click row to cross-filter)
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {filters.date && (
            <button
              className="filter-reset-btn"
              onClick={() => toggleFilter('date', filters.date!)}
              style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4 }}
            >
              Date: {filters.date} ✕
            </button>
          )}
          {filters.month && !filters.date && (
            <button
              className="filter-reset-btn"
              onClick={() => toggleFilter('month', filters.month!)}
              style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4 }}
            >
              Month: {filters.month} ✕
            </button>
          )}
          <span
            style={{
              fontSize: 11,
              color: 'var(--text-muted)',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {rows.length} {rows.length === 1 ? 'Record' : 'Records'}
          </span>
        </div>
      </div>
      <div className="card-body" style={{ padding: 0 }}>
        <div className="table-container" style={{ maxHeight: 360, overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', minWidth: 540 }}>
            <thead>
              <tr>
                <th style={{ minWidth: 120 }}>Date</th>
                <th style={{ textAlign: 'right' }}>Inflows (USD)</th>
                <th style={{ textAlign: 'right' }}>Outflows (USD)</th>
                <th style={{ textAlign: 'right' }}>Net Daily Flow</th>
                <th style={{ textAlign: 'right' }}>Ending Cash Balance</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="empty-state">
                    <div className="empty-state-title">No daily cash flow records found for active filter</div>
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const isPositive = row.net >= 0;
                  const isSelected = row.date === filters.date;
                  return (
                    <tr
                      key={row.date}
                      onClick={() => toggleFilter('date', row.date)}
                      style={{
                        cursor: 'pointer',
                        background: isSelected ? 'var(--accent-soft, rgba(59, 130, 246, 0.14))' : undefined,
                        borderLeft: isSelected ? '3px solid var(--accent, #3b82f6)' : '3px solid transparent',
                        transition: 'background 0.15s ease',
                      }}
                      title="Click to toggle cross-filter for this date"
                    >
                      <td style={{ fontWeight: isSelected ? 800 : 600, color: 'var(--text-primary)' }}>
                        {isSelected ? `▶ ${row.date}` : row.date}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>
                        {fmtUsd(row.inflows)}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--red)', fontVariantNumeric: 'tabular-nums' }}>
                        {fmtUsd(row.outflows)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span
                          className={`badge-pill ${isPositive ? 'high' : 'low'}`}
                          style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}
                        >
                          {isPositive ? '+' : ''}{fmtUsd(row.net)}
                        </span>
                      </td>
                      <td
                        style={{
                          textAlign: 'right',
                          fontWeight: 700,
                          color: 'var(--text-primary)',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {fmtUsd(row.cash)}
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
