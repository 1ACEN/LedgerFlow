import { fmt_usd } from '../../lib/api';
import { computeRevenueKpis, type RevenueRow } from './useRevenue';

interface Props {
  rows: RevenueRow[];
}

export default function RevenueKpiStrip({ rows }: Props) {
  const k = computeRevenueKpis(rows);

  return (
    <div className="grid-4">
      <div className="metric-card animate-in stagger-1">
        <div className="metric-label">Total Revenue (TTM)</div>
        <div className="metric-value" style={{ color: 'var(--accent)' }}>
          {fmt_usd(k.totalRevenue)}
        </div>
        <div className="metric-sub">gross invoiced across all lines</div>
      </div>

      <div className="metric-card animate-in stagger-2">
        <div className="metric-label">Net Revenue</div>
        <div className="metric-value" style={{ color: 'var(--green)' }}>
          {fmt_usd(k.netRevenue)}
        </div>
        <div className="metric-sub">after processing &amp; interchange fees</div>
      </div>

      <div className="metric-card animate-in stagger-3">
        <div className="metric-label">Gross Margin</div>
        <div
          className="metric-value"
          style={{ fontSize: '24px', marginTop: '5px', color: 'var(--yellow)' }}
        >
          {k.grossMarginPct}%
        </div>
        <div className="metric-sub">net ÷ gross revenue</div>
      </div>

      <div className="metric-card animate-in stagger-4">
        <div className="metric-label">MoM Growth (Latest)</div>
        <div
          className="metric-value"
          style={{
            fontSize: '24px',
            marginTop: '5px',
            color: k.momGrowth >= 0 ? 'var(--green)' : 'var(--red)',
          }}
        >
          {k.momGrowth >= 0 ? `+${k.momGrowth}%` : `${k.momGrowth}%`}
        </div>
        <div className="metric-sub">latest full month vs prior</div>
      </div>
    </div>
  );
}
