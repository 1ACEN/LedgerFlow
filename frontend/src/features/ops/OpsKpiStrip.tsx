import React from 'react';
import type { OpsKpis } from './useOps';

interface OpsKpiStripProps {
  kpis: OpsKpis;
  loading?: boolean;
}

function fmtUsd(v: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(v);
}

export const OpsKpiStrip: React.FC<OpsKpiStripProps> = ({ kpis, loading }) => {
  if (loading) {
    return (
      <div className="grid-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="metric-card skeleton-card">
            <div className="skeleton skeleton-text" style={{ width: '55%', marginBottom: 12 }} />
            <div className="skeleton skeleton-text" style={{ width: '75%', height: 36, marginBottom: 8 }} />
            <div className="skeleton skeleton-text" style={{ width: '45%' }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid-4">
      {/* Metric 1: Total Declines */}
      <div className="metric-card animate-in stagger-1">
        <div className="metric-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Total Declines Logged</span>
          <span style={{ fontSize: 14 }}>📉</span>
        </div>
        <div className="metric-value" style={{ color: 'var(--red)' }}>
          {kpis.totalDeclines.toLocaleString()}
        </div>
        <div className="metric-sub" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Leading cause:</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600, textTransform: 'capitalize' }}>
            {kpis.topDeclineCode}
          </span>
        </div>
      </div>

      {/* Metric 2: Gateway Success Rate */}
      <div className="metric-card animate-in stagger-2">
        <div className="metric-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Avg Gateway Success Rate</span>
          <span style={{ fontSize: 14 }}>🛡️</span>
        </div>
        <div className="metric-value" style={{ color: 'var(--green)' }}>
          {kpis.avgSuccessRate > 0 ? `${kpis.avgSuccessRate}%` : '—'}
        </div>
        <div className="metric-sub">
          Across Stripe, Plaid & direct rails
        </div>
      </div>

      {/* Metric 3: AI Expected Recovery */}
      <div className="metric-card animate-in stagger-3">
        <div className="metric-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>AI Predicted Recovery</span>
          <span style={{ fontSize: 14 }}>🤖</span>
        </div>
        <div className="metric-value" style={{ color: 'var(--purple)' }}>
          {fmtUsd(kpis.potentialRecoveryUsd)}
        </div>
        <div className="metric-sub">
          {kpis.highConfidenceRetryCount} high-probability retries (≥70%)
        </div>
      </div>

      {/* Metric 4: Disputes & Chargebacks */}
      <div className="metric-card animate-in stagger-4">
        <div className="metric-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Disputes Exposure</span>
          <span style={{ fontSize: 14 }}>⚖️</span>
        </div>
        <div className="metric-value" style={{ color: 'var(--yellow)' }}>
          {fmtUsd(kpis.totalDisputeAmount)}
        </div>
        <div className="metric-sub">
          {kpis.activeDisputesCount} active disputes pending
        </div>
      </div>
    </div>
  );
};
