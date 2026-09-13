import React, { useState } from 'react';
import { useLivePipeline } from './useLivePipeline';
import { LiveKpiStrip } from './LiveKpiStrip';
import { ManualTransactionForm } from './ManualTransactionForm';
import { SourceDistributionCard } from './SourceDistributionCard';
import { TransactionStreamCard } from './TransactionStreamCard';

interface LivePipelineTabProps {
  refreshKey?: number;
}

export const LivePipelineTab: React.FC<LivePipelineTabProps> = ({ refreshKey }) => {
  const [pollingEnabled, setPollingEnabled] = useState(true);

  const {
    kpis,
    transactions,
    loading,
    error,
    submitting,
    submitResult,
    submitTransaction,
    clearSubmitResult,
    refetch,
  } = useLivePipeline(refreshKey, pollingEnabled);

  if (error) {
    return (
      <div className="card" style={{ padding: 24, textAlign: 'center', borderColor: 'var(--red)' }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--red)', marginBottom: 6 }}>
          Failed to connect to Live Data Pipeline
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

  return (
    <div className="live-pipeline-tab-container" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 4-Card Live Stats Strip */}
      <LiveKpiStrip kpis={kpis} loading={loading} />

      {/* Main Grid: Form + Distribution (Left) | Real-time Stream (Right) */}
      <div className="grid-live">
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <ManualTransactionForm
            onSubmit={submitTransaction}
            submitting={submitting}
            submitResult={submitResult}
            onDismissResult={clearSubmitResult}
          />

          <SourceDistributionCard bySource={kpis.bySource} />
        </div>

        {/* Right Column: Live Stream Feed */}
        <TransactionStreamCard
          transactions={transactions}
          pollingEnabled={pollingEnabled}
          onTogglePolling={() => setPollingEnabled((p) => !p)}
        />
      </div>
    </div>
  );
};
