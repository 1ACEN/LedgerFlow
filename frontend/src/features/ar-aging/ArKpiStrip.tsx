import { fmt_usd } from '../../lib/api';
import type { ArSummary, CollectionEfficiency, ArAgingRow } from './useArAging';

interface Props {
  summary: ArSummary;
  efficiency: CollectionEfficiency;
  aging: ArAgingRow[];
}

export default function ArKpiStrip({ summary, efficiency }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* 5-Card Operational Command Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: 14,
        }}
      >
        {/* Card 1: Total Outstanding AR */}
        <div className="metric-card accent-blue animate-in stagger-1" style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span className="metric-label" style={{ fontWeight: 600 }}>Total AR Outstanding</span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: 4,
                background: 'rgba(59, 130, 246, 0.15)',
                color: '#60a5fa',
                border: '1px solid rgba(59, 130, 246, 0.3)',
              }}
            >
              Accrual Basis
            </span>
          </div>
          <div className="metric-value" style={{ color: 'var(--text-primary)', fontSize: 26 }}>
            {fmt_usd(summary.total_outstanding_usd)}
          </div>
          <div className="metric-sub" style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
            <span>{summary.total_invoices_count.toLocaleString()} open invoices</span>
            <span style={{ color: 'var(--text-muted)' }}>{summary.total_customers_count} accounts</span>
          </div>
        </div>

        {/* Card 2: Current vs Overdue Ratio */}
        <div className="metric-card accent-red animate-in stagger-2" style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span className="metric-label" style={{ fontWeight: 600 }}>Overdue Delinquency</span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: 4,
                background: summary.overdue_pct > 75 ? 'rgba(244, 63, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                color: summary.overdue_pct > 75 ? '#fb7185' : '#fbbf24',
                border: `1px solid ${summary.overdue_pct > 75 ? 'rgba(244, 63, 94, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
              }}
            >
              {summary.overdue_pct}% of AR
            </span>
          </div>
          <div className="metric-value" style={{ color: '#f43f5e', fontSize: 26 }}>
            {fmt_usd(summary.overdue_usd)}
          </div>
          {/* Split mini progress bar */}
          <div style={{ marginTop: 8 }}>
            <div
              style={{
                height: 5,
                background: 'var(--track-bg)',
                borderRadius: 3,
                display: 'flex',
                overflow: 'hidden',
              }}
            >
              <div
                title={`Current: ${summary.current_pct}%`}
                style={{ width: `${summary.current_pct}%`, background: '#10b981' }}
              />
              <div
                title={`Overdue: ${summary.overdue_pct}%`}
                style={{ width: `${summary.overdue_pct}%`, background: '#f43f5e' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 4, color: 'var(--text-secondary)' }}>
              <span style={{ color: '#10b981' }}>Current: {fmt_usd(summary.current_usd)}</span>
              <span>Past Due: {fmt_usd(summary.overdue_usd)}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Days Sales Outstanding (DSO) */}
        <div className="metric-card accent-green animate-in stagger-3" style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span className="metric-label" style={{ fontWeight: 600 }}>DSO (Turnover)</span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: 4,
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
                border: '1px solid rgba(16, 185, 129, 0.3)',
              }}
            >
              Target &lt; 30d
            </span>
          </div>
          <div className="metric-value" style={{ color: '#10b981', fontSize: 26 }}>
            {efficiency.dso_days} <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-secondary)' }}>days</span>
          </div>
          <div className="metric-sub" style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
            <span>Best Possible: {efficiency.best_possible_dso_days}d</span>
            <span style={{ color: 'var(--yellow)' }}>ADD: {efficiency.average_days_delinquent}d</span>
          </div>
        </div>

        {/* Card 4: Collection Effectiveness Index (CEI) */}
        <div className="metric-card accent-cyan animate-in stagger-4" style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span className="metric-label" style={{ fontWeight: 600 }}>Collection Efficiency (CEI)</span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: 4,
                background: 'rgba(59, 130, 246, 0.15)',
                color: '#60a5fa',
                border: '1px solid rgba(59, 130, 246, 0.3)',
              }}
            >
              {efficiency.cei_status}
            </span>
          </div>
          <div className="metric-value" style={{ color: 'var(--accent)', fontSize: 26 }}>
            {efficiency.cei_pct}%
          </div>
          <div className="metric-sub" style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
            <span>Realized (30d): {fmt_usd(efficiency.collections_realized_30d_usd)}</span>
            <span style={{ color: '#10b981' }}>{efficiency.collections_realization_rate_pct}% of goal</span>
          </div>
        </div>

        {/* Card 5: Bad Debt Reserve Provision */}
        <div className="metric-card accent-yellow animate-in stagger-5" style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span className="metric-label" style={{ fontWeight: 600 }}>Bad Debt Provision</span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: 4,
                background: 'rgba(245, 158, 11, 0.15)',
                color: '#fbbf24',
                border: '1px solid rgba(245, 158, 11, 0.3)',
              }}
            >
              {summary.provision_rate_pct}% Allowance
            </span>
          </div>
          <div className="metric-value" style={{ color: '#f59e0b', fontSize: 26 }}>
            {fmt_usd(summary.bad_debt_provision_usd)}
          </div>
          <div className="metric-sub" style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#f43f5e' }}>90+ Risk: {fmt_usd(summary.critical_90_plus_usd)}</span>
            <span>Reserve Adequacy 100%</span>
          </div>
        </div>
      </div>

      {/* Secondary Collections Telemetry Ticker */}
      <div
        className="telemetry-strip"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          padding: '10px 18px',
          fontSize: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
          <span style={{ color: 'var(--text-secondary)' }}>Ledger Portfolio:</span>
          <strong style={{ color: 'var(--text-primary)' }}>{summary.total_customers_count} Active Accounts</strong>
        </div>
        <div style={{ color: 'var(--border)' }}>|</div>
        <div>
          <span style={{ color: 'var(--text-secondary)' }}>Avg Open Invoice: </span>
          <strong style={{ color: 'var(--text-primary)' }}>{fmt_usd(summary.avg_invoice_usd)}</strong>
        </div>
        <div style={{ color: 'var(--border)' }}>|</div>
        <div>
          <span style={{ color: 'var(--text-secondary)' }}>Cash Recovered (Last 30d): </span>
          <strong style={{ color: '#10b981' }}>{fmt_usd(efficiency.collections_realized_30d_usd)}</strong>
        </div>
        <div style={{ color: 'var(--border)' }}>|</div>
        <div>
          <span style={{ color: 'var(--text-secondary)' }}>Delinquency Threshold: </span>
          <strong style={{ color: summary.critical_90_plus_pct > 20 ? '#f43f5e' : '#f59e0b' }}>
            {summary.critical_90_plus_pct}% in 90+ Day Aging
          </strong>
        </div>
      </div>
    </div>
  );
}
