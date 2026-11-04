import { fmt_usd } from '../../lib/api';
import type { OpsKpis } from './useOps';

interface OpsKpiStripProps {
  kpis: OpsKpis;
  loading?: boolean;
}

export const OpsKpiStrip = ({ kpis, loading }: OpsKpiStripProps) => {
  if (loading) {
    return (
      <div className="grid-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="metric-card skeleton-card" style={{ padding: '20px 22px' }}>
            <div className="skeleton skeleton-text" style={{ width: '50%', marginBottom: 12 }} />
            <div className="skeleton skeleton-text" style={{ width: '80%', height: 34, marginBottom: 8 }} />
            <div className="skeleton skeleton-text" style={{ width: '60%' }} />
          </div>
        ))}
      </div>
    );
  }

  const isHealthyAuth = kpis.avgSuccessRate >= 93.0;

  return (
    <div className="ops-kpi-container" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* 5 Core Modern AI Operations Console Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 14,
        }}
      >
        {/* Card 1: System Health & Anomaly Index */}
        <div
          className="metric-card animate-in stagger-1"
          style={{
            padding: '20px 22px',
            background: 'linear-gradient(180deg, rgba(20, 36, 48, 0.75) 0%, rgba(12, 22, 32, 0.9) 100%)',
            border: '1px solid rgba(14, 165, 233, 0.28)',
            boxShadow: 'inset 0 1px 0 0 rgba(14, 165, 233, 0.15), var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="metric-label" style={{ color: 'var(--text-secondary)' }}>
              Operational Health Index
            </span>
            <span className="badge-pill high" style={{ fontSize: 10 }}>
              Optimal Health
            </span>
          </div>
          <div
            className="metric-value"
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: '#38bdf8',
              fontFamily: "'JetBrains Mono', monospace",
              margin: '3px 0',
            }}
          >
            {kpis.systemHealthScore} / 100
          </div>
          <div className="metric-sub" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5 }}>
            <span style={{ color: 'var(--text-muted)' }}>AI Anomaly Engine</span>
            <span style={{ color: 'var(--green)', fontWeight: 600 }}>
              {kpis.anomaliesFlagged.length} Flagged / Contained
            </span>
          </div>
        </div>

        {/* Card 2: Authorization Success Rate */}
        <div
          className="metric-card animate-in stagger-2"
          style={{
            padding: '20px 22px',
            background: 'linear-gradient(180deg, rgba(18, 36, 28, 0.75) 0%, rgba(12, 22, 18, 0.9) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.24)',
            boxShadow: 'inset 0 1px 0 0 rgba(16, 185, 129, 0.15), var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="metric-label" style={{ color: 'var(--text-secondary)' }}>
              Global Auth Rate
            </span>
            <span className={`badge-pill ${isHealthyAuth ? 'high' : 'med'}`} style={{ fontSize: 10 }}>
              Across 6 Rails
            </span>
          </div>
          <div
            className="metric-value"
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: '#34d399',
              fontFamily: "'JetBrains Mono', monospace",
              margin: '3px 0',
            }}
          >
            {kpis.avgSuccessRate}%
          </div>
          <div className="metric-sub" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5 }}>
            <span style={{ color: 'var(--text-muted)' }}>{kpis.succeededCount.toLocaleString()} succeeded</span>
            <span style={{ color: 'var(--text-secondary)' }}>
              {kpis.failedCount.toLocaleString()} declines
            </span>
          </div>
        </div>

        {/* Card 3: Processed Volume & Throughput */}
        <div
          className="metric-card animate-in stagger-3"
          style={{
            padding: '20px 22px',
            background: 'linear-gradient(180deg, rgba(20, 28, 48, 0.75) 0%, rgba(13, 18, 32, 0.9) 100%)',
            border: '1px solid rgba(59, 130, 246, 0.22)',
            boxShadow: 'inset 0 1px 0 0 rgba(59, 130, 246, 0.15), var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="metric-label" style={{ color: 'var(--text-secondary)' }}>
              Total Processed Volume
            </span>
            <span className="badge-pill high" style={{ fontSize: 10 }}>
              ~{kpis.throughputTps} TPS
            </span>
          </div>
          <div
            className="metric-value"
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: '#60a5fa',
              fontFamily: "'JetBrains Mono', monospace",
              margin: '3px 0',
            }}
          >
            {fmt_usd(kpis.totalVolumeUsd)}
          </div>
          <div className="metric-sub" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5 }}>
            <span style={{ color: 'var(--text-muted)' }}>{kpis.totalTransactions.toLocaleString()} total events</span>
            <span style={{ color: 'var(--text-secondary)' }}>
              {kpis.pendingCount} in flight
            </span>
          </div>
        </div>

        {/* Card 4: AI Smart Recovery Expected */}
        <div
          className="metric-card animate-in stagger-4"
          style={{
            padding: '20px 22px',
            background: 'linear-gradient(180deg, rgba(28, 22, 45, 0.75) 0%, rgba(18, 14, 30, 0.9) 100%)',
            border: '1px solid rgba(139, 92, 246, 0.24)',
            boxShadow: 'inset 0 1px 0 0 rgba(139, 92, 246, 0.15), var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="metric-label" style={{ color: 'var(--text-secondary)' }}>
              AI Predicted Recovery
            </span>
            <span className="badge-pill high" style={{ fontSize: 10 }}>
              {kpis.automatedRecoveryRatePct}% Win Rate
            </span>
          </div>
          <div
            className="metric-value"
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: '#c084fc',
              fontFamily: "'JetBrains Mono', monospace",
              margin: '3px 0',
            }}
          >
            {fmt_usd(kpis.potentialRecoveryUsd)}
          </div>
          <div className="metric-sub" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5 }}>
            <span style={{ color: 'var(--text-muted)' }}>Smart Retry Pipeline</span>
            <span style={{ color: 'var(--purple)', fontWeight: 600 }}>
              {kpis.highConfidenceRetryCount} high-prob retries
            </span>
          </div>
        </div>

        {/* Card 5: Disputes & Risk Exposure */}
        <div
          className="metric-card animate-in stagger-4"
          style={{
            padding: '20px 22px',
            background: 'linear-gradient(180deg, rgba(35, 28, 20, 0.75) 0%, rgba(22, 17, 13, 0.9) 100%)',
            border: '1px solid rgba(245, 158, 11, 0.22)',
            boxShadow: 'inset 0 1px 0 0 rgba(245, 158, 11, 0.15), var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="metric-label" style={{ color: 'var(--text-secondary)' }}>
              Dispute Exposure
            </span>
            <span className="badge-pill med" style={{ fontSize: 10 }}>
              {kpis.disputeRateBps} bps
            </span>
          </div>
          <div
            className="metric-value"
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: '#fbbf24',
              fontFamily: "'JetBrains Mono', monospace",
              margin: '3px 0',
            }}
          >
            {fmt_usd(kpis.totalDisputeAmount)}
          </div>
          <div className="metric-sub" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5 }}>
            <span style={{ color: 'var(--text-muted)' }}>{kpis.activeDisputesCount} under review</span>
            <span style={{ color: 'var(--green)', fontWeight: 600 }}>
              {kpis.disputeWinRatePct}% won
            </span>
          </div>
        </div>
      </div>

      {/* AI Operations Console Telemetry Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: 12,
          padding: '12px 18px',
          background: 'rgba(14, 19, 31, 0.75)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)',
          fontSize: 12,
          color: 'var(--text-secondary)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--text-muted)' }}>Workflow Automation:</span>
          <span style={{ fontWeight: 700, color: 'var(--green)', fontFamily: "'JetBrains Mono', monospace" }}>
            {kpis.manualReductionPct}% Auto-Resolved
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--text-muted)' }}>Primary Decline:</span>
          <span style={{ fontWeight: 600, color: 'var(--yellow)', textTransform: 'capitalize' }}>
            {kpis.topDeclineCode}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--text-muted)' }}>Gateway Latency:</span>
          <span style={{ fontWeight: 600, color: 'var(--accent)', fontFamily: "'JetBrains Mono', monospace" }}>
            114ms (p95)
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--text-muted)' }}>Network Threshold:</span>
          <span style={{ color: 'var(--green)', fontWeight: 600 }}>
            {kpis.disputeRateBps < 90 ? 'Healthy (<90 bps)' : 'Elevated'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
          <span style={{ color: 'var(--text-muted)' }}>ML Engine:</span>
          <span className="badge-pill high" style={{ fontSize: 10 }}>
            Active Learning
          </span>
        </div>
      </div>
    </div>
  );
};
