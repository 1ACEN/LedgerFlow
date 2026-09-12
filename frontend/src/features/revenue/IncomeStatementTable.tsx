import { fmt_usd } from '../../lib/api';
import { formatProductLine, groupIncomeStatement, type RevenueRow } from './useRevenue';

interface Props {
  rows: RevenueRow[];
}

export default function IncomeStatementTable({ rows }: Props) {
  const groups = groupIncomeStatement(rows);

  return (
    <div className="card animate-in stagger-4" style={{ marginTop: '16px' }}>
      <div className="card-header">
        <div className="card-icon cyan">📑</div>
        <span className="card-title">Monthly Income Statement (Revenue &amp; P&amp;L)</span>
        <span className="card-subtitle">net vs gross · product-line split with subtotals</span>
      </div>
      <div className="card-body" style={{ padding: 0 }}>
        <div className="table-container" style={{ maxHeight: '420px' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '120px' }}>Month</th>
                <th>Account / Product Line</th>
                <th style={{ textAlign: 'right' }}>Gross USD</th>
                <th style={{ textAlign: 'right' }}>Net USD</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <MonthGroupBlock key={group.month} group={group} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MonthGroupBlock({ group }: { group: ReturnType<typeof groupIncomeStatement>[number] }) {
  return (
    <>
      <tr className="pl-month-header">
        <td colSpan={4}>
          <strong style={{ letterSpacing: '0.5px' }}>{group.month.slice(0, 7)}</strong>
        </td>
      </tr>
      {group.rows.map((row) => (
        <tr key={`${row.month}-${row.product_line}`}>
          <td></td>
          <td>
            <code
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '11px',
                background: 'var(--accent-soft)',
                color: 'var(--text-primary)',
                padding: '2px 8px',
                borderRadius: '4px',
              }}
            >
              {formatProductLine(row.product_line)}
            </code>
          </td>
          <td style={{ textAlign: 'right' }}>{fmt_usd(row.revenue)}</td>
          <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt_usd(row.net_revenue)}</td>
        </tr>
      ))}
      <tr className="pl-subtotal">
        <td colSpan={2} style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
          Subtotal ({group.month.slice(0, 7)})
        </td>
        <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt_usd(group.gross)}</td>
        <td style={{ textAlign: 'right', color: 'var(--green)', fontWeight: 700 }}>
          {fmt_usd(group.net)}
        </td>
      </tr>
    </>
  );
}
