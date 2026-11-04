import { useState } from 'react';
import { fmt_usd } from '../../lib/api';
import type { TrendPeriodItem } from './useCashflow';

interface MonthlyQuarterlyTrendsCardProps {
  monthlyTrends: TrendPeriodItem[];
  quarterlyTrends: TrendPeriodItem[];
}

export const MonthlyQuarterlyTrendsCard = ({
  monthlyTrends,
  quarterlyTrends,
}: MonthlyQuarterlyTrendsCardProps) => {
  const [viewMode, setViewMode] = useState<'monthly' | 'quarterly'>('monthly');

  const activeTrends = viewMode === 'monthly' ? monthlyTrends : quarterlyTrends;
  // Reverse so newest period is at the top of the table
  const rows = [...activeTrends].reverse();

  return (
    <div className="card animate-in stagger-3" style={{ height: '100%' }}>
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
          <span className="card-title">
            {viewMode === 'monthly' ? 'Monthly Cash Flow Trends (12 Months)' : 'Quarterly Cash Flow Trends (5 Quarters)'}
          </span>
          <span className="card-subtitle" style={{ display: 'block' }}>
            Historical inflows, outflows, net change, and period-end liquidity positions
          </span>
        </div>

        {/* View Mode Toggle */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: 'rgba(255, 255, 255, 0.04)',
            padding: 3,
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
          }}
        >
          <button
            className={`filter-btn ${viewMode === 'monthly' ? 'active' : ''}`}
            onClick={() => setViewMode('monthly')}
            style={{ fontSize: 11, padding: '3px 9px' }}
          >
            Monthly (12 Mo)
          </button>
          <button
            className={`filter-btn ${viewMode === 'quarterly' ? 'active' : ''}`}
            onClick={() => setViewMode('quarterly')}
            style={{ fontSize: 11, padding: '3px 9px' }}
          >
            Quarterly (5 Qtr)
          </button>
        </div>
      </div>

      <div className="card-body" style={{ padding: 0 }}>
        <div className="table-container" style={{ maxHeight: 380 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ minWidth: 100 }}>Period</th>
                <th style={{ textAlign: 'right' }}>Inflows (USD)</th>
                <th style={{ textAlign: 'right' }}>Outflows (USD)</th>
                <th style={{ textAlign: 'right' }}>Net Cash Flow</th>
                <th style={{ textAlign: 'right' }}>Period Ending Cash</th>
                <th style={{ textAlign: 'center', width: 110 }}>Flow Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="empty-state">
                    <div className="empty-state-title">No historical trend data found</div>
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const isPositive = row.net_flow >= 0;
                  return (
                    <tr key={row.period}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>
                        {row.period}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>
                        +{fmt_usd(row.inflows)}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--red)', fontVariantNumeric: 'tabular-nums' }}>
                        -{fmt_usd(row.outflows)}
                      </td>
                      <td
                        style={{
                          textAlign: 'right',
                          fontWeight: 700,
                          color: isPositive ? 'var(--green)' : 'var(--red)',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {isPositive ? '+' : ''}{fmt_usd(row.net_flow)}
                      </td>
                      <td
                        style={{
                          textAlign: 'right',
                          fontWeight: 700,
                          color: 'var(--text-primary)',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {fmt_usd(row.ending_cash)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge-pill ${isPositive ? 'high' : 'low'}`} style={{ fontSize: 10 }}>
                          {isPositive ? 'Net Surplus' : 'Net Burn'}
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
