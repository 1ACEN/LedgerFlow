import React from 'react';
import { useOps } from './useOps';
import { OpsKpiStrip } from './OpsKpiStrip';
import { DeclinesChart } from './DeclinesChart';
import { SuccessTrendChart } from './SuccessTrendChart';
import { RetryAdvisorTable } from './RetryAdvisorTable';
import { DisputesTable } from './DisputesTable';

interface OpsTabProps {
  refreshKey?: number;
}

export const OpsTab: React.FC<OpsTabProps> = ({ refreshKey }) => {
  const { data, kpis, loading, error, refetch } = useOps(refreshKey);

  if (error) {
    return (
      <div className="card" style={{ padding: 24, textAlign: 'center', borderColor: 'var(--red)' }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--red)', marginBottom: 6 }}>
          Failed to load Fintech Ops & AI Analytics
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
          {error}
        </div>
        <button
          className="refresh-btn"
          onClick={refetch}
          style={{ display: 'inline-flex', margin: '0 auto' }}
        >
          🔄 Try Again
        </button>
      </div>
    );
  }

  const declines = data?.declines || [];
  const successTrend = data?.success_trend || [];
  const retryAdvisor = data?.retry_advisor || [];
  const disputes = data?.disputes || [];

  return (
    <div className="ops-tab-container" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top 4-card metric strip */}
      <OpsKpiStrip kpis={kpis} loading={loading} />

      {/* 2-column Charts row */}
      {loading ? (
        <div className="grid-2">
          {[1, 2].map((i) => (
            <div key={i} className="card skeleton-card">
              <div className="skeleton skeleton-text" style={{ width: '50%', marginBottom: 16 }} />
              <div className="skeleton skeleton-block" style={{ height: 280 }} />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid-2">
          <DeclinesChart declines={declines} />
          <SuccessTrendChart trend={successTrend} />
        </div>
      )}

      {/* AI Decline Retry Advisor Table */}
      {!loading && <RetryAdvisorTable rows={retryAdvisor} />}

      {/* Chargebacks & Disputes Queue */}
      {!loading && <DisputesTable disputes={disputes} />}
    </div>
  );
};
