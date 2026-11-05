import { fmt_usd } from '../../lib/api';
import type { ArBucket } from './useArAging';

interface Props {
  buckets: ArBucket[];
  totalOutstanding: number;
}

const BUCKET_CONFIG: Record<string, { color: string; border: string; bgSoft: string; icon: string }> = {
  current: {
    color: '#10b981',
    border: 'rgba(16, 185, 129, 0.3)',
    bgSoft: 'rgba(16, 185, 129, 0.08)',
    icon: '✓',
  },
  days_31_60: {
    color: '#f59e0b',
    border: 'rgba(245, 158, 11, 0.3)',
    bgSoft: 'rgba(245, 158, 11, 0.08)',
    icon: '!',
  },
  days_61_90: {
    color: '#f97316',
    border: 'rgba(249, 115, 22, 0.3)',
    bgSoft: 'rgba(249, 115, 22, 0.08)',
    icon: '⚠',
  },
  days_90_plus: {
    color: '#f43f5e',
    border: 'rgba(244, 63, 94, 0.3)',
    bgSoft: 'rgba(244, 63, 94, 0.08)',
    icon: '✕',
  },
};

export default function AgingBucketAnalysisCard({ buckets, totalOutstanding }: Props) {
  return (
    <div className="card animate-in" style={{ padding: '20px 22px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
              Aging Bucket Analysis (0–30, 31–60, 61–90, 90+ Days)
            </span>
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: 4,
                background: 'rgba(59, 130, 246, 0.12)',
                color: 'var(--accent)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
              }}
            >
              Risk Stratification
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-secondary)' }}>
            Stratified exposure distribution with bad debt allowance reserve provisioning
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Total Exposure</span>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
            {fmt_usd(totalOutstanding)}
          </div>
        </div>
      </div>

      {/* Stacked Risk Spectrum Bar */}
      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            height: 12,
            background: 'var(--track-bg)',
            borderRadius: 6,
            display: 'flex',
            overflow: 'hidden',
            gap: 2,
          }}
        >
          {buckets.map((b) => {
            const cfg = BUCKET_CONFIG[b.range_key] || BUCKET_CONFIG.current;
            return (
              <div
                key={b.range_key}
                title={`${b.bucket}: ${fmt_usd(b.amount_usd)} (${b.percentage}%)`}
                style={{
                  width: `${Math.max(b.percentage, 2)}%`,
                  background: cfg.color,
                  transition: 'width 0.3s ease',
                }}
              />
            );
          })}
        </div>
      </div>

      {/* 4 Stratified Bucket Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 12,
        }}
      >
        {buckets.map((b) => {
          const cfg = BUCKET_CONFIG[b.range_key] || BUCKET_CONFIG.current;
          return (
            <div
              key={b.range_key}
              style={{
                background: cfg.bgSoft,
                border: `1px solid ${cfg.border}`,
                borderRadius: 8,
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {b.bucket}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: cfg.border,
                      color: cfg.color,
                    }}
                  >
                    {b.risk_tier}
                  </span>
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: cfg.color, marginBottom: 2 }}>
                  {fmt_usd(b.amount_usd)}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                  {b.percentage}% of AR · {b.invoice_count} invoices
                </div>
              </div>

              <div
                style={{
                  marginTop: 14,
                  paddingTop: 10,
                  borderTop: `1px solid ${cfg.border}`,
                  fontSize: 11,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Status:</span>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{b.status_label}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Provision ({b.provision_rate_pct}%):</span>
                  <span style={{ color: cfg.color, fontWeight: 700 }}>{fmt_usd(b.loss_provision_usd)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Est. Recovery:</span>
                  <span style={{ color: '#10b981', fontWeight: 600 }}>{b.recovery_expectation_pct}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

