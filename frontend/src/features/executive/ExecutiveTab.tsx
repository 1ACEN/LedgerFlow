import React from 'react';
import { useExecutive } from './useExecutive';
import { ExecutiveKpiStrip } from './ExecutiveKpiStrip';
import { CashTrajectoryChart } from './CashTrajectoryChart';
import { DailyFlowsChart } from './DailyFlowsChart';
import { ExecutiveFlowsTable } from './ExecutiveFlowsTable';

interface ExecutiveTabProps {
  refreshKey?: number;
}

export const ExecutiveTab: React.FC<ExecutiveTabProps> = ({ refreshKey }) => {
  const { data, kpis, loading, error, refetch } = useExecutive(refreshKey);

  if (error) {
    return (
      <div className="card" style={{ padding: 24, textAlign: 'center', borderColor: 'var(--red)' }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--red)', marginBottom: 6 }}>
          Failed to load Executive Overview
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

  const trend = data?.cash_trend || [];

  return (
    <div className="executive-tab-container" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Metric Strip */}
      <ExecutiveKpiStrip kpis={kpis} loading={loading} />

      {/* Main Charts Row */}
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
          <CashTrajectoryChart trend={trend} />
          <DailyFlowsChart trend={trend} />
        </div>
      )}

      {/* 30-Day Liquidity Ledger Table */}
      {!loading && trend.length > 0 && <ExecutiveFlowsTable trend={trend} />}
    </div>
  );
};
