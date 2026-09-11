import { fmt_usd } from '../../lib/api';
import { topOverdue, type ArAgingRow } from './useArAging';

interface Props {
  aging: ArAgingRow[];
}

// Ported from the "Top Overdue Customers" spotlight card: highest 90+ day
// balances, ranked 1-5, with an empty state when nothing is overdue.
export default function OverdueSpotlight({ aging }: Props) {
  const overdues = topOverdue(aging, 5);

  return (
    <div className="card animate-in stagger-1">
      <div className="card-header">
        <div className="card-icon red">🚨</div>
        <span className="card-title">Top Overdue Customers</span>
        <span className="card-subtitle">highest 90+ day balances</span>
      </div>
      <div className="card-body" style={{ padding: 0 }}>
        {overdues.length === 0 ? (
          <div className="empty-state" style={{ padding: '32px' }}>
            <div className="empty-state-icon">✅</div>
            <div className="empty-state-title">No 90+ day overdue balances</div>
            <div className="empty-state-desc">
              All receivables are within acceptable aging buckets
            </div>
          </div>
        ) : (
          <div className="overdue-spotlight">
            {overdues.map((row, i) => (
              <div className="overdue-row" key={row.customer_id}>
                <div className="overdue-rank">{i + 1}</div>
                <div className="overdue-info">
                  <div className="overdue-name">{row.customer_name || row.customer_id}</div>
                  <div className="overdue-meta">
                    {row.invoices} invoice{row.invoices !== 1 ? 's' : ''} ·{' '}
                    {fmt_usd(row.total)} total
                  </div>
                </div>
                <div className="overdue-amount">{fmt_usd(row.days_90_plus)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}