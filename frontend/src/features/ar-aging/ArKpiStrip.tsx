import { fmt_usd } from '../../lib/api';
import { arKpis, type ArAgingRow } from './useArAging';

interface Props {
  aging: ArAgingRow[];
}

// The 4-card KPI strip. Ported from de id-ar-kpi-* metric cards in the
// classic dashboard with the exact same reduce math (arKpis()).
export default function ArKpiStrip({ aging }: Props) {
  const k = arKpis(aging);

  return (
    <div className="grid-4">
      <div className="metric-card animate-in stagger-1">
        <div className="metric-label">Total Outstanding</div>
        <div className="metric-value" style={{ color: 'var(--accent)' }}>
          {fmt_usd(k.total)}
        </div>
        <div className="metric-sub">{k.invoices} open invoices</div>
      </div>

      <div className="metric-card animate-in stagger-2">
        <div className="metric-label">Customers With AR</div>
        <div className="metric-value" style={{ color: 'var(--green)' }}>
          {k.customers.toLocaleString()}
        </div>
        <div className="metric-sub">active receivable accounts</div>
      </div>

      <div className="metric-card animate-in stagger-3">
        <div className="metric-label">Avg Invoice Value</div>
        <div
          className="metric-value"
          style={{ fontSize: '24px', marginTop: '5px', color: 'var(--yellow)' }}
        >
          {fmt_usd(k.avgInvoice)}
        </div>
        <div className="metric-sub">total ÷ # invoices</div>
      </div>

      <div className="metric-card animate-in stagger-4">
        <div className="metric-label">Overdue 90+ Days</div>
        <div
          className="metric-value"
          style={{ fontSize: '24px', marginTop: '5px', color: 'var(--red)' }}
        >
          {k.overduePct}%
        </div>
        <div className="metric-sub">share of total outstanding</div>
      </div>
    </div>
  );
}