import { fmt_usd } from '../../lib/api';
import type { WeeklyFlow } from './useCashflow';
import { useCrossFilter } from '../../lib/CrossFilterContext';

interface Props {
  weekly: WeeklyFlow[];
}

export default function WeeklyFlowTable({ weekly }: Props) {
  const { filters, toggleFilter } = useCrossFilter();
  // Sort latest week first
  const rows = [...weekly].reverse();

  return (
    <div className="card animate-in stagger-4" style={{ height: '100%' }}>
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span className="card-title">12-Week Rolling Cash Flow Ledger</span>
          <span className="card-subtitle" style={{ display: 'block' }}>
            Weekly gross inflows, operational outflows, net movement, and operating position (Click row to filter month)
          </span>
        </div>
        {filters.month && (
          <button
            className="filter-reset-btn"
            onClick={() => toggleFilter('month', filters.month!)}
            style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4 }}
          >
            {filters.month} ✕
          </button>
        )}
      </div>
      <div className="card-body" style={{ padding: 0 }}>
        <div className="table-container" style={{ maxHeight: '380px', overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', minWidth: 540 }}>
            <thead>
              <tr>
                <th style={{ minWidth: 110 }}>Week</th>
                <th style={{ textAlign: 'right' }}>Inflows (USD)</th>
                <th style={{ textAlign: 'right' }}>Outflows (USD)</th>
                <th style={{ textAlign: 'right' }}>Net Flow (USD)</th>
                <th style={{ textAlign: 'center', width: '120px' }}>Operating Position</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const month = row.week.slice(0, 7);
                const isSelected = filters.month === month;
                return (
                  <tr
                    key={row.week}
                    onClick={() => toggleFilter('month', month)}
                    style={{
                      cursor: 'pointer',
                      background: isSelected ? 'var(--accent-soft, rgba(59, 130, 246, 0.14))' : undefined,
                      borderLeft: isSelected ? '3px solid var(--accent, #3b82f6)' : '3px solid transparent',
                      transition: 'background 0.15s ease',
                    }}
                    title={`Click to filter by month ${month}`}
                  >
                    <td style={{ fontWeight: isSelected ? 800 : 600, color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>
                      {isSelected ? `▶ ${row.week}` : row.week}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--green)', fontVariantNumeric: 'tabular-nums' }}>
                      +{fmt_usd(row.inflows)}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--red)', fontVariantNumeric: 'tabular-nums' }}>
                      -{fmt_usd(row.outflows)}
                    </td>
                    <td
                      style={{
                        textAlign: 'right',
                        fontWeight: 700,
                        color: row.net >= 0 ? 'var(--green)' : 'var(--red)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {row.net >= 0 ? '+' : ''}
                      {fmt_usd(row.net)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span
                        className={`badge-pill ${row.net >= 0 ? 'high' : 'low'}`}
                        style={{ fontSize: 10 }}
                      >
                        {row.net >= 0 ? 'Net Surplus' : 'Net Burn'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
