import React, { useState, useMemo } from 'react';
import type { RetryAdvisorRow } from './useOps';

interface RetryAdvisorTableProps {
  rows: RetryAdvisorRow[];
}

function fmtUsd(v: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(v);
}

function shortId(id: string): string {
  if (!id) return '—';
  return id.length > 18 ? `${id.slice(0, 8)}…${id.slice(-6)}` : id;
}

export const RetryAdvisorTable: React.FC<RetryAdvisorTableProps> = ({ rows }) => {
  const [minProb, setMinProb] = useState<number>(0);

  const filteredRows = useMemo(() => {
    if (minProb === 0) return rows;
    return rows.filter(r => r.probability >= minProb);
  }, [rows, minProb]);

  const totalFilteredRecovery = useMemo(() => {
    return filteredRows.reduce((sum, r) => sum + r.recovery_usd, 0);
  }, [filteredRows]);

  return (
    <div className="card animate-in stagger-3" style={{ marginBottom: 20 }}>
      <div
        className="card-header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="card-icon purple">🤖</div>
          <div>
            <span className="card-title">AI Decline Retry Advisor (ML Smart Routing Recommendations)</span>
            <span className="card-subtitle" style={{ display: 'block' }}>
              LightGBM model predictions for highest-yield payment recovery actions
            </span>
          </div>
        </div>

        {/* Filter Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Filter probability:</span>
          <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius-sm)', padding: 2 }}>
            <button
              className={`filter-btn ${minProb === 0 ? 'active' : ''}`}
              onClick={() => setMinProb(0)}
              style={{
                background: minProb === 0 ? 'var(--accent)' : 'transparent',
                color: minProb === 0 ? '#fff' : 'var(--text-secondary)',
                border: 'none',
                padding: '4px 10px',
                fontSize: 11,
                fontWeight: 600,
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
              }}
            >
              All ({rows.length})
            </button>
            <button
              className={`filter-btn ${minProb === 40 ? 'active' : ''}`}
              onClick={() => setMinProb(40)}
              style={{
                background: minProb === 40 ? 'var(--accent)' : 'transparent',
                color: minProb === 40 ? '#fff' : 'var(--text-secondary)',
                border: 'none',
                padding: '4px 10px',
                fontSize: 11,
                fontWeight: 600,
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
              }}
            >
              ≥ 40%
            </button>
            <button
              className={`filter-btn ${minProb === 70 ? 'active' : ''}`}
              onClick={() => setMinProb(70)}
              style={{
                background: minProb === 70 ? 'var(--accent)' : 'transparent',
                color: minProb === 70 ? '#fff' : 'var(--text-secondary)',
                border: 'none',
                padding: '4px 10px',
                fontSize: 11,
                fontWeight: 600,
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
              }}
            >
              ≥ 70% High
            </button>
          </div>
        </div>
      </div>

      <div className="card-body" style={{ padding: 0 }}>
        <div className="table-container" style={{ maxHeight: 380 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>Decline Reason</th>
                <th>Card Brand</th>
                <th>Funding</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th style={{ textAlign: 'center' }}>Success Prob</th>
                <th>Recommended Action</th>
                <th style={{ textAlign: 'right' }}>Expected Recovery</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="empty-state">
                    <div className="empty-state-title">No recommendations match the filter</div>
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const pillClass =
                    row.probability >= 70 ? 'high' : row.probability >= 40 ? 'med' : 'low';

                  return (
                    <tr key={row.transaction_id}>
                      <td>
                        <code
                          style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 11,
                            background: 'var(--accent-soft)',
                            padding: '2px 6px',
                            borderRadius: 4,
                            color: 'var(--text-primary)',
                          }}
                        >
                          {shortId(row.transaction_id)}
                        </code>
                      </td>
                      <td style={{ textTransform: 'capitalize' }}>
                        {(row.decline_code || '—').replace(/_/g, ' ')}
                      </td>
                      <td>{row.brand || '—'}</td>
                      <td style={{ textTransform: 'capitalize' }}>{row.funding || '—'}</td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {fmtUsd(row.amount_usd)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge-pill ${pillClass}`} style={{ fontWeight: 600 }}>
                          {row.probability}%
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                          {(row.action || '—').replace(/_/g, ' ')}
                        </strong>
                      </td>
                      <td
                        style={{
                          textAlign: 'right',
                          color: 'var(--green)',
                          fontWeight: 700,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {fmtUsd(row.recovery_usd)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filteredRows.length > 0 && (
              <tfoot>
                <tr style={{ background: 'rgba(12,16,25,0.85)', borderTop: '1px solid var(--border)' }}>
                  <td colSpan={7} style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Total Recoverable Pipeline ({filteredRows.length} transactions):
                  </td>
                  <td
                    style={{
                      textAlign: 'right',
                      fontWeight: 700,
                      color: 'var(--green)',
                      fontSize: 13,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {fmtUsd(totalFilteredRecovery)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
