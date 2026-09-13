import React from 'react';
import type { DisputeRow } from './useOps';

interface DisputesTableProps {
  disputes: DisputeRow[];
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

export const DisputesTable: React.FC<DisputesTableProps> = ({ disputes }) => {
  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('won')) {
      return <span className="badge-pill high">Won ✅</span>;
    }
    if (s.includes('lost')) {
      return <span className="badge-pill low">Lost ❌</span>;
    }
    if (s.includes('needs_response')) {
      return <span className="badge-pill med">Needs Response ⏳</span>;
    }
    return <span className="badge-pill" style={{ background: 'var(--cyan-soft)', color: 'var(--cyan)' }}>{status}</span>;
  };

  return (
    <div className="card animate-in stagger-4">
      <div className="card-header">
        <div className="card-icon yellow">⚖️</div>
        <div>
          <span className="card-title">Chargebacks & Disputes Queue</span>
          <span className="card-subtitle" style={{ display: 'block' }}>
            Active contested transactions requiring merchant evidence or representment
          </span>
        </div>
      </div>
      <div className="card-body" style={{ padding: 0 }}>
        <div className="table-container" style={{ maxHeight: 340 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Dispute ID</th>
                <th>Transaction ID</th>
                <th>Customer ID</th>
                <th style={{ textAlign: 'right' }}>Dispute USD</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th>Filed Date</th>
                <th>Evidence Due</th>
              </tr>
            </thead>
            <tbody>
              {disputes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty-state">
                    <div className="empty-state-title">No active disputes or chargebacks logged</div>
                  </td>
                </tr>
              ) : (
                disputes.map((d) => (
                  <tr key={d.dispute_id}>
                    <td>
                      <code
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 11,
                          background: 'rgba(245, 158, 11, 0.12)',
                          color: 'var(--yellow)',
                          padding: '2px 6px',
                          borderRadius: 4,
                        }}
                      >
                        {d.dispute_id}
                      </code>
                    </td>
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
                        {shortId(d.transaction_id)}
                      </code>
                    </td>
                    <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
                      {d.customer_id || '—'}
                    </td>
                    <td
                      style={{
                        textAlign: 'right',
                        fontWeight: 700,
                        color: 'var(--red)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {fmtUsd(d.amount_usd)}
                    </td>
                    <td style={{ textAlign: 'center' }}>{getStatusBadge(d.status)}</td>
                    <td>{d.created_at ? d.created_at.slice(0, 10) : '—'}</td>
                    <td>
                      <span style={{ color: 'var(--yellow)', fontWeight: 500 }}>
                        {d.due_by ? d.due_by.slice(0, 10) : '—'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
