import React from 'react';
import type { CashTrendPoint } from './useExecutive';

interface ExecutiveFlowsTableProps {
  trend: CashTrendPoint[];
}

function fmtUsd(v: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(v);
}

export const ExecutiveFlowsTable: React.FC<ExecutiveFlowsTableProps> = ({ trend }) => {
  // Present rows in reverse chronological order (newest date first)
  const rows = [...trend].reverse();

  return (
    <div className="card animate-in stagger-4" style={{ marginTop: 20 }}>
      <div className="card-header">
        <div className="card-icon cyan">📑</div>
        <div>
          <span className="card-title">30-Day Liquidity & Cash Flow Ledger</span>
          <span className="card-subtitle" style={{ display: 'block' }}>
            Daily audited inflows, outflows, net change, and close-of-day cash balance
          </span>
        </div>
      </div>
      <div className="card-body" style={{ padding: 0 }}>
        <div className="table-container" style={{ maxHeight: 360 }}>
          <table className="data-table">
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
                    <div className="empty-state-title">No daily cash flow records found</div>
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const isPositive = row.net >= 0;
                  return (
                    <tr key={row.date}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {row.date}
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
