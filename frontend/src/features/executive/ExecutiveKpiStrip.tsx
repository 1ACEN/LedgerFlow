import React from 'react';
import type { ExecutiveKpis } from './useExecutive';

interface ExecutiveKpiStripProps {
  kpis: ExecutiveKpis;
  loading?: boolean;
}

function fmtUsd(v: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(v);
}

export const ExecutiveKpiStrip: React.FC<ExecutiveKpiStripProps> = ({ kpis, loading }) => {
  if (loading) {
    return (
      <div className="grid-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="metric-card skeleton-card">
            <div className="skeleton skeleton-text" style={{ width: '60%', marginBottom: 12 }} />
            <div className="skeleton skeleton-text" style={{ width: '80%', height: 36, marginBottom: 8 }} />
            <div className="skeleton skeleton-text" style={{ width: '40%' }} />
          </div>
        ))}
      </div>
    );
  }

  const isPositiveNet = kpis.net30dChange >= 0;

  return (
    <div className="executive-kpi-container" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="grid-4">
        {/* Metric 1: Current Cash Balance */}
        <div className="metric-card animate-in stagger-1">
          <div className="metric-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Current Cash Balance</span>
            <span style={{ fontSize: 14 }}>🏦</span>
          </div>
          <div className="metric-value" style={{ color: 'var(--green)' }}>
            {fmtUsd(kpis.currentCash)}
          </div>
          <div className="metric-sub" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Treasury + Operating</span>
            <span style={{ color: isPositiveNet ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
              {isPositiveNet ? '▲ +' : '▼ -'}
              {fmtUsd(Math.abs(kpis.net30dChange))} (30d)
            </span>
          </div>
        </div>

        {/* Metric 2: P50 Runway */}
        <div className="metric-card animate-in stagger-2">
          <div className="metric-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>P50 Runway</span>
            <span
              className={`badge-pill ${
                kpis.runwayStatus === 'healthy' ? 'high' : kpis.runwayStatus === 'moderate' ? 'med' : 'low'
              }`}
              style={{ fontSize: 10, textTransform: 'uppercase', padding: '2px 8px' }}
            >
              {kpis.runwayStatus}
            </span>
          </div>
          <div className="metric-value" style={{ color: 'var(--accent)' }}>
            {kpis.runwayDays > 0 ? `${kpis.runwayDays} days` : '—'}
          </div>
          <div className="metric-sub">
            ML forecasted runway
          </div>
        </div>

        {/* Metric 3: Daily Outflow */}
        <div className="metric-card animate-in stagger-3">
          <div className="metric-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Daily Outflow (30d avg)</span>
            <span style={{ fontSize: 14 }}>🔥</span>
          </div>
          <div className="metric-value" style={{ color: 'var(--yellow)' }}>
            {fmtUsd(kpis.dailyOutflow)}
          </div>
          <div className="metric-sub">
            Operating burn rate
          </div>
        </div>

        {/* Metric 4: Gateway Success Rate */}
        <div className="metric-card animate-in stagger-4">
          <div className="metric-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Gateway Success Rate</span>
            <span style={{ fontSize: 14 }}>⚡</span>
          </div>
          <div className="metric-value" style={{ color: 'var(--purple)' }}>
            {kpis.gatewaySuccessRate > 0 ? `${kpis.gatewaySuccessRate}%` : '—'}
          </div>
          <div className="metric-sub">
            Across all payment channels
          </div>
        </div>
      </div>

      {/* Secondary Quick-Stats Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 12,
          padding: '10px 16px',
          background: 'rgba(12, 16, 25, 0.65)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)',
          fontSize: 12,
          color: 'var(--text-secondary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--text-muted)' }}>30D Gross Inflows:</span>
          <span style={{ fontWeight: 600, color: 'var(--accent)', fontFamily: 'JetBrains Mono, monospace' }}>
            {fmtUsd(kpis.totalInflows30d)}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--text-muted)' }}>30D Gross Outflows:</span>
          <span style={{ fontWeight: 600, color: 'var(--red)', fontFamily: 'JetBrains Mono, monospace' }}>
            {fmtUsd(kpis.totalOutflows30d)}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--text-muted)' }}>Total Ledger Records:</span>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace' }}>
            {kpis.totalTransactions.toLocaleString()}
          </span>
        </div>
        {kpis.lastIngested && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
            <span style={{ color: 'var(--text-muted)' }}>Last Event:</span>
            <span style={{ color: 'var(--green)', fontFamily: 'JetBrains Mono, monospace' }}>
              {new Date(kpis.lastIngested).toLocaleDateString()} {new Date(kpis.lastIngested).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
