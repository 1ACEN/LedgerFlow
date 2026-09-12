import { fmt_usd } from '../../lib/api';
import type { WeeklyFlow } from './useCashflow';

interface Props {
  weekly: WeeklyFlow[];
}

export default function WeeklyFlowTable({ weekly }: Props) {
  return (
    <div className="card animate-in stagger-4">
      <div className="card-header">
        <div className="card-icon green">📋</div>
        <span className="card-title">Historical Weekly Cash Breakdown</span>
        <span className="card-subtitle">inflows vs outflows · rolling 12 weeks</span>
      </div>
      <div className="card-body" style={{ padding: 0 }}>
        <div className="table-container" style={{ maxHeight: '380px' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Week</th>
                <th style={{ textAlign: 'right' }}>Inflows</th>
                <th style={{ textAlign: 'right' }}>Outflows</th>
                <th style={{ textAlign: 'right' }}>Net Flow</th>
                <th style={{ textAlign: 'center', width: '110px' }}>Position</th>
              </tr>
            </thead>
            <tbody>
              {weekly.map((row) => (
                <tr key={row.week}>
                  <td>
                    <strong>{row.week}</strong>
                  </td>
                  <td style={{ textAlign: 'right', color: 'var(--green)' }}>
                    +{fmt_usd(row.inflows)}
                  </td>
                  <td style={{ textAlign: 'right', color: 'var(--red)' }}>
                    -{fmt_usd(row.outflows)}
                  </td>
                  <td
                    style={{
                      textAlign: 'right',
                      fontWeight: 700,
                      color: row.net >= 0 ? 'var(--green)' : 'var(--red)',
                    }}
                  >
                    {row.net >= 0 ? '+' : ''}
                    {fmt_usd(row.net)}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span
                      className={`badge-pill ${row.net >= 0 ? 'high' : 'low'}`}
                    >
                      {row.net >= 0 ? 'Surplus' : 'Deficit'}
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
