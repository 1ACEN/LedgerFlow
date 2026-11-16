import { fmt_usd } from '../../lib/api';
import { formatProductLine, groupIncomeStatement, type RevenueRow } from './useRevenue';
import { useCrossFilter } from '../../lib/CrossFilterContext';

interface Props {
  rows: RevenueRow[];
  style?: React.CSSProperties;
}

export default function IncomeStatementTable({ rows, style }: Props) {
  const { filters, toggleFilter } = useCrossFilter();

  // If filtered by month, filter groups; if filtered by product, filter rows within groups
  const filteredRows = rows.filter((r) => {
    if (filters.month && r.month.slice(0, 7) !== filters.month) return false;
    if (filters.productLine && r.product_line !== filters.productLine) return false;
    return true;
  });

  const displayRows = filteredRows.length > 0 ? filteredRows : rows;
  const groups = groupIncomeStatement(displayRows);

  return (
    <div className="card animate-in stagger-4" style={{ marginTop: 0, height: '100%', ...style }}>
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span className="card-title">Monthly Income Statement (Revenue &amp; P&amp;L)</span>
          <span className="card-subtitle" style={{ display: 'block' }}>
            net vs gross · product-line split with subtotals
          </span>
        </div>
        <span
          style={{
            fontSize: 10,
            color: 'var(--text-muted)',
            border: '1px dashed var(--border-color)',
            padding: '2px 6px',
            borderRadius: 4,
          }}
        >
          Click row or month to filter
        </span>
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
                <MonthGroupBlock
                  key={group.month}
                  group={group}
                  activeMonth={filters.month}
                  activeProduct={filters.productLine}
                  onToggleMonth={(m) => toggleFilter('month', m)}
                  onToggleProduct={(p) => toggleFilter('productLine', p)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MonthGroupBlock({
  group,
  activeMonth,
  activeProduct,
  onToggleMonth,
  onToggleProduct,
}: {
  group: ReturnType<typeof groupIncomeStatement>[number];
  activeMonth: string | null;
  activeProduct: string | null;
  onToggleMonth: (m: string) => void;
  onToggleProduct: (p: string) => void;
}) {
  const isMonthSelected = activeMonth === group.month.slice(0, 7);

  return (
    <>
      <tr
        className="pl-month-header"
        onClick={() => onToggleMonth(group.month.slice(0, 7))}
        style={{
          cursor: 'pointer',
          background: isMonthSelected ? 'var(--accent-soft)' : undefined,
        }}
        title="Click to filter by this month"
      >
        <td colSpan={4}>
          <strong style={{ letterSpacing: '0.5px', color: isMonthSelected ? 'var(--accent)' : undefined }}>
            {isMonthSelected ? '▶ ' : ''}{group.month.slice(0, 7)}
          </strong>
        </td>
      </tr>
      {group.rows.map((row) => {
        const isProductSelected = activeProduct === row.product_line;

        return (
          <tr
            key={`${row.month}-${row.product_line}`}
            onClick={() => onToggleProduct(row.product_line)}
            style={{
              cursor: 'pointer',
              background: isProductSelected ? 'var(--accent-soft)' : undefined,
            }}
            title="Click to cross-filter by this product line"
          >
            <td></td>
            <td>
              <code
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '11px',
                  background: isProductSelected ? 'var(--accent)' : 'var(--accent-soft)',
                  color: isProductSelected ? '#ffffff' : 'var(--text-primary)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  border: isProductSelected ? '1px solid #ffffff' : undefined,
                  transition: 'all 0.15s ease',
                }}
              >
                {isProductSelected ? '✓ ' : ''}{formatProductLine(row.product_line)}
              </code>
            </td>
            <td style={{ textAlign: 'right' }}>{fmt_usd(row.revenue)}</td>
            <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt_usd(row.net_revenue)}</td>
          </tr>
        );
      })}
      <tr className="pl-subtotal">
        <td colSpan={2} style={{ textAlign: 'right', fontSize: '11px', color: 'var(--text-muted)' }}>
          {group.month.slice(0, 7)} Subtotal
        </td>
        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>
          {fmt_usd(group.gross)}
        </td>
        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--green)' }}>
          {fmt_usd(group.net)}
        </td>
      </tr>
    </>
  );
}
