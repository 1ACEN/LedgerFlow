import { fmt_usd } from '../../lib/api';
import type { WeeklyFlow } from './useCashflow';

interface Props {
  weekly: WeeklyFlow[];
}

export default function WeeklyFlowTable({ weekly }: Props) {
  // Sort latest week first
  const rows = [...weekly].reverse();

  return (
    <div className="card animate-in stagger-4" style={{ height: '100%' }}>
      <div className="card-header">
        <div>
          <span className="card-title">12-Week Rolling Cash Flow Ledger</span>
          <span className="card-subtitle" style={{ display: 'block' }}>
            Weekly gross inflows, operational outflows, net movement, and operating position
          </span>
        </div>
      </div>
      <div className="card-body" style={{ padding: 0 }}>
        <div className="table-container" style={{ maxHeight: '380px' }}>
          <table className="data-table">
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
              {rows.map((row) => (
                <tr key={row.week}>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>
                    {row.week}
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
