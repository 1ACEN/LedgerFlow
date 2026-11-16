import React, { useState, useMemo } from 'react';
import type { RetryAdvisorRow } from './useOps';
import { useCrossFilter } from '../../lib/CrossFilterContext';

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

function formatAction(action: string): string {
  if (!action) return 'Standard Retry';
  return action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export const RetryAdvisorTable: React.FC<RetryAdvisorTableProps> = ({ rows }) => {
  const { filters, toggleFilter } = useCrossFilter();
  const [minProb, setMinProb] = useState<number>(0);

  const filteredRows = useMemo(() => {
    let result = rows;
    if (minProb > 0) {
      result = result.filter((r) => r.probability >= minProb);
    }
    if (filters.declineCode) {
      result = result.filter(
        (r) =>
          r.decline_code?.toLowerCase() === filters.declineCode?.toLowerCase() ||
          r.decline_code?.toLowerCase().replace(/_/g, ' ') ===
            filters.declineCode?.toLowerCase().replace(/_/g, ' ')
      );
    }
    return result;
  }, [rows, minProb, filters.declineCode]);

  const totalFilteredRecovery = useMemo(() => {
    return filteredRows.reduce((sum, r) => sum + r.recovery_usd, 0);
  }, [filteredRows]);

  return (
    <div className="card animate-in stagger-3" style={{ marginBottom: 20 }}>
      <div
        className="card-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <span className="card-title">AI Decline Retry Advisor (ML Smart Routing Recommendations)</span>
          <span className="card-subtitle" style={{ display: 'block' }}>
            LightGBM model predictions for highest-yield payment recovery actions (Click reason to filter)
          </span>
        </div>

        {/* Filter Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {filters.declineCode && (
            <button
              className="filter-reset-btn"
              onClick={() => toggleFilter('declineCode', filters.declineCode!)}
              style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4 }}
            >
              Reason: {filters.declineCode.replace(/_/g, ' ')} ✕
            </button>
          )}

          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Filter probability:</span>
          <div className="filter-group">
            <button
              className={`filter-btn ${minProb === 0 ? 'active' : ''}`}
              onClick={() => setMinProb(0)}
            >
              All ({rows.length})
            </button>
            <button
              className={`filter-btn ${minProb === 40 ? 'active' : ''}`}
              onClick={() => setMinProb(40)}
            >
              ≥ 40%
            </button>
            <button
              className={`filter-btn ${minProb === 70 ? 'active' : ''}`}
              onClick={() => setMinProb(70)}
            >
              ≥ 70% High
            </button>
          </div>
        </div>
      </div>

      <div className="card-body" style={{ padding: 0 }}>
        <div className="table-container" style={{ maxHeight: 380, overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', minWidth: 640 }}>
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
                  const isSelected =
                    filters.declineCode &&
                    row.decline_code?.toLowerCase() === filters.declineCode?.toLowerCase();

                  return (
                    <tr
                      key={row.transaction_id}
                      onClick={() => toggleFilter('declineCode', row.decline_code)}
                      style={{
                        cursor: 'pointer',
                        background: isSelected ? 'var(--accent-soft, rgba(59, 130, 246, 0.14))' : undefined,
                        borderLeft: isSelected ? '3px solid var(--accent, #3b82f6)' : '3px solid transparent',
                        transition: 'background 0.15s ease',
                      }}
                      title="Click to toggle cross-filter for this decline reason"
                    >
                      <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                        {shortId(row.transaction_id)}
                      </td>
                      <td>
                        <span
                          style={{
                            fontWeight: isSelected ? 800 : 600,
                            color: isSelected ? 'var(--accent)' : 'var(--text-primary)',
                          }}
                        >
                          {isSelected ? `▶ ${row.decline_code.replace(/_/g, ' ')}` : row.decline_code.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>{row.brand}</td>
                      <td>
                        <span
                          style={{
                            fontSize: 10,
                            textTransform: 'uppercase',
                            padding: '2px 5px',
                            borderRadius: 3,
                            background: 'var(--pill-bg)',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          {row.funding}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {fmtUsd(row.amount_usd)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge-pill ${pillClass}`} style={{ fontSize: 11, fontWeight: 700 }}>
                          {row.probability.toFixed(0)}%
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            fontWeight: 600,
                            color: row.action === 'do_not_retry' ? 'var(--text-muted)' : 'var(--text-primary)',
                          }}
                        >
                          {formatAction(row.action)}
                        </span>
                      </td>
                      <td
                        style={{
                          textAlign: 'right',
                          fontWeight: 700,
                          color: row.recovery_usd > 0 ? 'var(--green)' : 'var(--text-muted)',
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
          </table>
        </div>

        <div
          style={{
            padding: '10px 16px',
            borderTop: '1px solid var(--border)',
            background: 'var(--surface-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 12,
            color: 'var(--text-secondary)',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <span>Showing {filteredRows.length} recommendations</span>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
            Pipeline Expected Yield:{' '}
            <span style={{ color: 'var(--green)', fontFamily: "'JetBrains Mono', monospace" }}>
              {fmtUsd(totalFilteredRecovery)}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
};
