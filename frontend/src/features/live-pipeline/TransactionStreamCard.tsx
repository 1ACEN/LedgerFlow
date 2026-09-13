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
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'refund':
        return '↩️';
      case 'payout':
        return '💸';
      case 'invoice_payment':
        return '📑';
      case 'fee':
        return '🏷️';
      case 'transfer':
        return '🔄';
      default:
        return '💳';
    }
  };

  return (
    <div className="card animate-in stagger-3" style={{ minHeight: 560, display: 'flex', flexDirection: 'column' }}>
      <div
        className="card-header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="card-icon purple">⚡</div>
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
        </div>

        {/* Stream Toggle Control */}
        <button
          onClick={onTogglePolling}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: pollingEnabled ? 'var(--green-soft)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${pollingEnabled ? 'rgba(16,185,129,0.3)' : 'var(--border)'}`,
            color: pollingEnabled ? 'var(--green)' : 'var(--text-secondary)',
            padding: '5px 11px',
            borderRadius: 'var(--radius-sm)',
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
          }}
          title={pollingEnabled ? 'Pause live polling' : 'Resume live stream'}
        >
          {pollingEnabled ? '⏸ Pause Stream' : '▶ Resume Stream'}
        </button>
      </div>

      <div className="card-body" style={{ flex: 1, padding: '12px 16px', overflowY: 'auto', maxHeight: 600 }}>
        {transactions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">⚡</div>
            <div className="empty-state-title">Awaiting real-time feed…</div>
            <div className="empty-state-desc">Transactions will appear here as they arrive</div>
          </div>
        ) : (
          <div className="feed-list" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {transactions.map((t) => {
              const isPos = ['charge', 'invoice_payment'].includes(t.type) && t.status === 'succeeded';
              const isNeg = ['refund', 'fee'].includes(t.type);
              const sign = isNeg ? '-' : isPos ? '+' : '';
              const amtColor = isPos ? 'var(--green)' : isNeg ? 'var(--red)' : 'var(--text-primary)';

              return (
                <div
                  key={t.transaction_id}
                  className="feed-item"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 14px',
                    background: 'rgba(12, 16, 25, 0.65)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    transition: 'var(--transition)',
                  }}
                >
                  <div
                    className="feed-type-badge"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(255, 255, 255, 0.04)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 16,
                      flexShrink: 0,
                    }}
                  >
                    {getTypeIcon(t.type)}
                  </div>

                  <div className="feed-info" style={{ flex: 1, minWidth: 0 }}>
                    <div
                      className="feed-id"
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 11,
                        color: 'var(--text-muted)',
                      }}
                    >
                      {shortId(t.transaction_id)}
                    </div>
                    <div
                      className="feed-desc"
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {t.description || t.product_line?.replace(/_/g, ' ') || '—'}
                    </div>
                    <div className="feed-tags" style={{ display: 'flex', gap: 6, marginTop: 3 }}>
                      <span
                        className={`tag source-${t.source}`}
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          padding: '1px 6px',
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
                          padding: '1px 6px',
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

                  <div className="feed-amount" style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div
                      className="feed-usd"
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: amtColor,
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    >
                      {sign}{fmtUsd(t.amount_usd)}
                    </div>
                    <div
                      className={`feed-status ${t.status}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 11,
                        fontWeight: 600,
                        color: t.status === 'succeeded' ? 'var(--green)' : t.status === 'failed' ? 'var(--red)' : 'var(--yellow)',
                        textTransform: 'capitalize',
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
