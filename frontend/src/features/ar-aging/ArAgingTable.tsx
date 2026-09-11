import { fmt_usd } from '../../lib/api';
import { arSeverity, type ArAgingRow } from './useArAging';

interface Props {
  aging: ArAgingRow[];
}

// Ported from #table-ar: rows get a severity class (color-coded left border)
// and the legend below maps each color to its aging bucket.
export default function ArAgingTable({ aging }: Props) {
  return (
    <>
      <div className="card-body" style={{ padding: 0 }}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th style={{ textAlign: 'center' }}>Invoices</th>
                <th style={{ textAlign: 'right' }}>Total Outstanding</th>
                <th style={{ textAlign: 'right' }}>Current (&lt;30d)</th>
                <th style={{ textAlign: 'right' }}>31-60 Days</th>
                <th style={{ textAlign: 'right' }}>61-90 Days</th>
                <th style={{ textAlign: 'right' }}>90+ Days</th>
              </tr>
            </thead>
            <tbody>
              {aging.map((row) => {
                const sev = arSeverity(row);
                return (
                  <tr key={row.customer_id} className={`ar-severity-${sev}`}>
                    <td>
                      <strong>{row.customer_name || row.customer_id}</strong>
                    </td>
                    <td style={{ textAlign: 'center' }}>{row.invoices}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt_usd(row.total)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--green)' }}>
                      {fmt_usd(row.current)}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--yellow)' }}>
                      {fmt_usd(row.days_31_60)}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--orange)' }}>
                      {fmt_usd(row.days_61_90)}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--red)' }}>
                      {fmt_usd(row.days_90_plus)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="severity-legend">
          <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Severity:</span>
          <div className="severity-legend-item">
            <div className="severity-legend-dot" style={{ background: 'var(--green)' }}></div>
            Current (&lt;30d)
          </div>
          <div className="severity-legend-item">
            <div className="severity-legend-dot" style={{ background: 'var(--yellow)' }}></div>
            31–60 Days
          </div>
          <div className="severity-legend-item">
            <div className="severity-legend-dot" style={{ background: 'var(--orange)' }}></div>
            61–90 Days
          </div>
          <div className="severity-legend-item">
            <div className="severity-legend-dot" style={{ background: 'var(--red)' }}></div>
            90+ Days
          </div>
        </div>
      </div>
    </>
  );
}