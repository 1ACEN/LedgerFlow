import React from 'react';
import type { LiveTransaction } from './useLivePipeline';
import { shortId } from './useLivePipeline';

interface TransactionStreamCardProps {
  transactions: LiveTransaction[];
  pollingEnabled: boolean;
  onTogglePolling: () => void;
}

function fmtUsd(v: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(v);
}

export const TransactionStreamCard: React.FC<TransactionStreamCardProps> = ({
  transactions,
  pollingEnabled,
  onTogglePolling,
}) => {
  const getTypeTag = (type: string) => {
    switch (type) {
      case 'refund':
        return 'REF';
      case 'payout':
        return 'PAY';
      case 'invoice_payment':
        return 'INV';
      case 'fee':
        return 'FEE';
      case 'transfer':
        return 'TRF';
      default:
        return 'CHG';
    }
  };

  return (
    <div className="card animate-in stagger-3" style={{ minHeight: 560, display: 'flex', flexDirection: 'column' }}>
      <div
        className="card-header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}
      >
        <div>
          <span className="card-title">Real-Time Transaction Stream</span>
          <span className="card-subtitle" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {pollingEnabled && (
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--green)',
                  boxShadow: '0 0 6px var(--green-glow)',
                  display: 'inline-block',
                }}
              />
            )}
            {transactions.length} recent events · streaming from DuckDB
          </span>
        </div>

        {/* Stream Toggle Control */}
        <button
          onClick={onTogglePolling}
          className="link-btn"
          style={{
            background: pollingEnabled ? 'var(--green-soft)' : undefined,
            borderColor: pollingEnabled ? 'rgba(16,185,129,0.3)' : undefined,
            color: pollingEnabled ? 'var(--green)' : 'var(--text-secondary)',
            fontWeight: 600,
            fontSize: 11,
            padding: '4px 10px',
          }}
          title={pollingEnabled ? 'Pause live polling' : 'Resume live stream'}
        >
          {pollingEnabled ? 'Pause Stream' : 'Resume Stream'}
        </button>
      </div>

      <div className="card-body" style={{ flex: 1, padding: '12px 16px', overflowY: 'auto', maxHeight: 600 }}>
        {transactions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-title">Awaiting real-time feed…</div>
            <div className="empty-state-desc">Transactions will appear here as they arrive</div>
          </div>
        ) : (
          <div className="feed-list">
            {transactions.map((t) => {
              const isPos = ['charge', 'invoice_payment'].includes(t.type) && t.status === 'succeeded';
              const isNeg = ['refund', 'fee', 'payout'].includes(t.type) || (t.net_amount_usd != null && t.net_amount_usd < 0);
              const sign = isNeg ? '-' : isPos ? '+' : '';
              const amtColor = isPos ? 'var(--green)' : isNeg ? 'var(--red)' : 'var(--text-primary)';

              return (
                <div
                  key={t.transaction_id}
                  className="feed-item"
                >
                  <div className="feed-type-badge">
                    {getTypeTag(t.type)}
                  </div>

                  <div className="feed-info">
                    <div className="feed-id">
                      {shortId(t.transaction_id)}
                    </div>
                    <div className="feed-desc">
                      {t.description || t.product_line?.replace(/_/g, ' ') || '—'}
                    </div>
                    <div className="feed-tags">
                      <span
                        className={`tag source-${t.source}`}
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          padding: '2px 7px',
                          borderRadius: 4,
                          background: 'rgba(255, 255, 255, 0.05)',
                          color: 'var(--text-secondary)',
                          textTransform: 'uppercase',
                        }}
                      >
                        {t.source}
                      </span>
                      <span
                        className={`tag type-${t.type}`}
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          padding: '2px 7px',
                          borderRadius: 4,
                          background: 'var(--accent-soft)',
                          color: 'var(--accent)',
                          textTransform: 'uppercase',
                        }}
                      >
                        {t.type}
                      </span>
                    </div>
                  </div>

                  <div className="feed-amount">
                    <div
                      className="feed-usd"
                      style={{ color: amtColor }}
                    >
                      {sign}{fmtUsd(Math.abs(t.amount_usd))}
                    </div>
                    <div
                      className={`feed-status ${t.status}`}
                      style={{
                        color: t.status === 'succeeded' ? 'var(--green)' : t.status === 'failed' ? 'var(--red)' : 'var(--yellow)',
                      }}
                    >
                      <span
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: '50%',
                          background: t.status === 'succeeded' ? 'var(--green)' : t.status === 'failed' ? 'var(--red)' : 'var(--yellow)',
                          display: 'inline-block',
                        }}
                      />
                      {t.status}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
