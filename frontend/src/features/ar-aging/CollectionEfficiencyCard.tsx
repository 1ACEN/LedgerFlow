import { fmt_usd } from '../../lib/api';
import type { CollectionEfficiency } from './useArAging';

interface Props {
  efficiency: CollectionEfficiency;
}

export default function CollectionEfficiencyCard({ efficiency }: Props) {
  return (
    <div className="card animate-in" style={{ padding: '20px 22px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
              Collection Efficiency &amp; Velocity
            </span>
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: 4,
                background: 'rgba(16, 185, 129, 0.12)',
                color: '#34d399',
                border: '1px solid rgba(16, 185, 129, 0.25)',
              }}
            >
              {efficiency.cei_status}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-secondary)' }}>
            Working capital turnaround, Days Sales Outstanding (DSO), and cash realization velocity
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
        {/* Metric 1: DSO & ADD Turnover Gauge */}
        <div
          style={{
            background: 'var(--surface-subtle)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '16px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)' }}>
              Turnover Benchmarks (DSO)
            </span>
            <span style={{ fontSize: 11, color: '#10b981', fontWeight: 600 }}>{efficiency.dso_status}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 28, fontWeight: 800, color: '#10b981' }}>{efficiency.dso_days}</span>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Days Actual DSO</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>/ 30d Goal</span>
          </div>

          {/* Visual comparison bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 11.5 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Actual DSO:</span>
                <span style={{ fontWeight: 600, color: '#10b981' }}>{efficiency.dso_days} days</span>
              </div>
              <div style={{ height: 6, background: 'var(--track-bg)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, (efficiency.dso_days / 45) * 100)}%`, height: '100%', background: '#10b981' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Best Possible DSO (BPDSO):</span>
                <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{efficiency.best_possible_dso_days} days</span>
              </div>
              <div style={{ height: 6, background: 'var(--track-bg)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, (efficiency.best_possible_dso_days / 45) * 100)}%`, height: '100%', background: 'var(--accent)' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Average Days Delinquent (ADD):</span>
                <span style={{ fontWeight: 600, color: '#f59e0b' }}>{efficiency.average_days_delinquent} days</span>
              </div>
              <div style={{ height: 6, background: 'var(--track-bg)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, (efficiency.average_days_delinquent / 45) * 100)}%`, height: '100%', background: '#f59e0b' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Metric 2: CEI & Realized Inflow Velocity */}
        <div
          style={{
            background: 'var(--surface-subtle)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '16px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)' }}>
              Collection Effectiveness Index
            </span>
            <span style={{ fontSize: 11, color: '#60a5fa', fontWeight: 600 }}>Target: &gt; {efficiency.cei_target_pct}%</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent)' }}>{efficiency.cei_pct}%</span>
            <span style={{ fontSize: 13, color: '#10b981', fontWeight: 600 }}>+3.4% vs Industry Baseline</span>
          </div>

          {/* Realized Cash vs Goal */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 11.5 }}>
            <div style={{ background: 'var(--surface-subtle)', padding: '10px 12px', borderRadius: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: 'var(--text-secondary)' }}>30-Day Collections Realized:</span>
                <strong style={{ color: '#10b981' }}>{fmt_usd(efficiency.collections_realized_30d_usd)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: 'var(--text-muted)' }}>Monthly Target ({fmt_usd(efficiency.collections_target_30d_usd)}):</span>
                <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{efficiency.collections_realization_rate_pct}%</span>
              </div>
              <div style={{ height: 6, background: 'var(--track-bg)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, efficiency.collections_realization_rate_pct)}%`, height: '100%', background: '#10b981' }} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-secondary)' }}>
              <span>Total Loss Reserve Coverage:</span>
              <strong style={{ color: '#f59e0b' }}>{fmt_usd(efficiency.bad_debt_provision_usd)}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

