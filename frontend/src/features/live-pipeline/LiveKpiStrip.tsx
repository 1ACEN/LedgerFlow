import React from 'react';
import { LivePipelineKpis, formatTimeAgo } from './useLivePipeline';

interface LiveKpiStripProps {
  kpis: LivePipelineKpis;
  loading?: boolean;
}

function fmtUsd(v: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(v);
}

export const LiveKpiStrip: React.FC<LiveKpiStripProps> = ({ kpis, loading }) => {
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

  const lastEventTime = kpis.lastIngested ? new Date(kpis.lastIngested).toLocaleTimeString() : '—';
  const lastEventAgo = formatTimeAgo(kpis.lastIngested);

  return (
    <div className="grid-4">
      {/* Metric 1: Total Transactions */}
      <div className="metric-card animate-in stagger-1">
        <div className="metric-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Total Transactions</span>
          <span style={{ fontSize: 14 }}>💾</span>
        </div>
        <div className="metric-value" style={{ color: 'var(--accent)' }}>
          {kpis.totalTransactions > 0 ? kpis.totalTransactions.toLocaleString() : '—'}
        </div>
        <div className="metric-sub">in DuckDB ledger</div>
      </div>

      {/* Metric 2: Today's Ingested Volume */}
      <div className="metric-card animate-in stagger-2">
        <div className="metric-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Today's Ingested Volume</span>
          <span style={{ fontSize: 14 }}>📈</span>
        </div>
        <div className="metric-value" style={{ color: 'var(--green)' }}>
          {kpis.todayVolume.toLocaleString()}
        </div>
        <div className="metric-sub">
          {fmtUsd(kpis.todayTotalUsd)} total
        </div>
      </div>

      {/* Metric 3: Live Success Rate */}
      <div className="metric-card animate-in stagger-3">
        <div className="metric-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Live Success Rate</span>
          <span style={{ fontSize: 14 }}>⚡</span>
        </div>
        <div className="metric-value" style={{ color: 'var(--yellow)' }}>
          {kpis.liveSuccessRate != null ? `${kpis.liveSuccessRate}%` : '—'}
        </div>
        <div className="metric-sub">settled transactions</div>
      </div>

      {/* Metric 4: Last Ingested Event */}
      <div className="metric-card animate-in stagger-4">
        <div className="metric-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Last Ingested Event</span>
          <span style={{ fontSize: 14 }}>🕒</span>
        </div>
        <div
          className="metric-value"
          style={{
            color: 'var(--purple)',
            fontSize: 20,
            marginTop: 4,
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {lastEventTime}
        </div>
        <div className="metric-sub" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              display: 'inline-block',
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--green)',
              boxShadow: '0 0 6px var(--green-glow)',
            }}
          />
          <span>{lastEventAgo}</span>
        </div>
      </div>
    </div>
  );
};
