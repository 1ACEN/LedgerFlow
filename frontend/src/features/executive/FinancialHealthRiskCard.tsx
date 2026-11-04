import React from 'react';
import type { ExecutiveKpis } from './useExecutive';

interface FinancialHealthRiskCardProps {
  kpis: ExecutiveKpis;
}

function fmtUsd(v: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(v);
}

export const FinancialHealthRiskCard: React.FC<FinancialHealthRiskCardProps> = ({ kpis }) => {
  const isHealthyRunway = kpis.runwayStatus === 'healthy';
  const isModerateRunway = kpis.runwayStatus === 'moderate';

  const arOverdueHigh = kpis.arRisk.overdue_90plus_pct > 20;

  return (
    <div className="card animate-in stagger-3" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="card-header">
        <div>
          <span className="card-title">Financial Health &amp; Risk Indicators</span>
          <span className="card-subtitle" style={{ display: 'block' }}>
            Core solvency, runway horizon, and operational risk metrics
          </span>
        </div>
      </div>
      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Metric 1: Runway Horizon */}
        <div
          style={{
            padding: '12px 14px',
            background: 'rgba(255, 255, 255, 0.025)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Runway Horizon (P50)
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)', marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
              {kpis.runwayDays > 0 ? `${kpis.runwayDays} days` : '—'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1 }}>
              ~{Math.floor(kpis.runwayDays / 30)} months forward capital buffer
            </div>
          </div>
          <span
            className={`badge-pill ${
              isHealthyRunway ? 'high' : isModerateRunway ? 'med' : 'low'
            }`}
          >
            {kpis.runwayStatus}
          </span>
        </div>

        {/* Metric 2: Operating Burn Rate */}
        <div
          style={{
            padding: '12px 14px',
            background: 'rgba(255, 255, 255, 0.025)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Operating Cash Burn
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--yellow)', marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
              {fmtUsd(kpis.dailyOutflow)} / day
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1 }}>
              30-day average daily cash outflow
            </div>
          </div>
          <span className="badge-pill med">
            Burn Watch
          </span>
        </div>

        {/* Metric 3: Gateway Authorization Rate */}
        <div
          style={{
            padding: '12px 14px',
            background: 'rgba(255, 255, 255, 0.025)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Gateway Auth Rate
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--green)', marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
              {kpis.gatewaySuccessRate > 0 ? `${kpis.gatewaySuccessRate}%` : '—'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1 }}>
              Payment pipeline authorization rate
            </div>
          </div>
          <span className={`badge-pill ${kpis.gatewaySuccessRate >= 95 ? 'high' : 'med'}`}>
            {kpis.gatewaySuccessRate >= 95 ? 'Optimal' : 'Active Routing'}
          </span>
        </div>

        {/* Metric 4: AR Delinquency Risk */}
        <div
          style={{
            padding: '12px 14px',
            background: 'rgba(255, 255, 255, 0.025)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              AR 90+ Delinquency
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: arOverdueHigh ? 'var(--red)' : 'var(--text-primary)', marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
              {fmtUsd(kpis.arRisk.overdue_90plus_usd)}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1 }}>
              {kpis.arRisk.overdue_90plus_pct}% of total {fmtUsd(kpis.arRisk.total_outstanding_usd)} AR
            </div>
          </div>
          <span className={`badge-pill ${arOverdueHigh ? 'low' : 'high'}`}>
            {arOverdueHigh ? 'Overdue High' : 'Controlled'}
          </span>
        </div>
      </div>
    </div>
  );
};

