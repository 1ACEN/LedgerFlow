import { useState, useMemo } from 'react';
import { fmt_usd } from '../../lib/api';
import { arSeverity, type ArAgingRow } from './useArAging';
import { useCrossFilter } from '../../lib/CrossFilterContext';

interface Props {
  aging: ArAgingRow[];
}

type FilterBucket = 'all' | 'critical' | 'elevated' | 'moderate' | 'current';

export default function ArAgingTable({ aging }: Props) {
  const { filters } = useCrossFilter();
  const [searchTerm, setSearchTerm] = useState('');
  const [bucketFilter, setBucketFilter] = useState<FilterBucket>('all');
  const [pageSize, setPageSize] = useState<number>(25);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const handleAction = (customer: string, action: string) => {
    setActionFeedback(`✓ Action recorded: "${action}" for ${customer}`);
    setTimeout(() => {
      setActionFeedback(null);
    }, 3000);
  };

  const filtered = useMemo(() => {
    let result = aging;

    // Power BI Cross-Filter by Aging Bucket if selected in ArBucketChart
    if (filters.agingBucket) {
      if (filters.agingBucket === 'current') {
        result = result.filter((row) => row.current > 0);
      } else if (filters.agingBucket === 'days_31_60') {
        result = result.filter((row) => row.days_31_60 > 0);
      } else if (filters.agingBucket === 'days_61_90') {
        result = result.filter((row) => row.days_61_90 > 0);
      } else if (filters.agingBucket === 'days_90_plus') {
        result = result.filter((row) => row.days_90_plus > 0);
      }
    }

    // Filter by bucket severity tab
    if (bucketFilter !== 'all') {
      result = result.filter((row) => arSeverity(row) === bucketFilter);
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (row) =>
          row.customer_name?.toLowerCase().includes(q) ||
          row.customer_id.toLowerCase().includes(q) ||
          row.customer_email?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [aging, bucketFilter, searchTerm]);

  const displayedRows = useMemo(() => {
    return filtered.slice(0, pageSize);
  }, [filtered, pageSize]);

  // Counts for filter pills
  const counts = useMemo(() => {
    return {
      all: aging.length,
      critical: aging.filter((r) => arSeverity(r) === 'critical').length,
      elevated: aging.filter((r) => arSeverity(r) === 'elevated').length,
      moderate: aging.filter((r) => arSeverity(r) === 'moderate').length,
      current: aging.filter((r) => arSeverity(r) === 'current').length,
    };
  }, [aging]);

  return (
    <div>
      {/* Search and Filter Controls */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        {/* Bucket Filter Pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={() => setBucketFilter('all')}
            style={{
              padding: '5px 11px',
              fontSize: 11.5,
              fontWeight: 600,
              borderRadius: 6,
              background: bucketFilter === 'all' ? 'var(--accent)' : 'var(--pill-bg)',
              color: bucketFilter === 'all' ? '#fff' : 'var(--text-secondary)',
              border: `1px solid ${bucketFilter === 'all' ? 'var(--accent)' : 'var(--pill-border)'}`,
              cursor: 'pointer',
            }}
          >
            All Accounts ({counts.all})
          </button>

          <button
            onClick={() => setBucketFilter('critical')}
            style={{
              padding: '5px 11px',
              fontSize: 11.5,
              fontWeight: 600,
              borderRadius: 6,
              background: bucketFilter === 'critical' ? 'rgba(244, 63, 94, 0.2)' : 'var(--pill-bg)',
              color: bucketFilter === 'critical' ? '#fb7185' : 'var(--text-secondary)',
              border: `1px solid ${bucketFilter === 'critical' ? '#f43f5e' : 'var(--pill-border)'}`,
              cursor: 'pointer',
            }}
          >
            Critical 90+d ({counts.critical})
          </button>

          <button
            onClick={() => setBucketFilter('elevated')}
            style={{
              padding: '5px 11px',
              fontSize: 11.5,
              fontWeight: 600,
              borderRadius: 6,
              background: bucketFilter === 'elevated' ? 'rgba(249, 115, 22, 0.2)' : 'var(--pill-bg)',
              color: bucketFilter === 'elevated' ? '#fb923c' : 'var(--text-secondary)',
              border: `1px solid ${bucketFilter === 'elevated' ? '#f97316' : 'var(--pill-border)'}`,
              cursor: 'pointer',
            }}
          >
            Elevated 61–90d ({counts.elevated})
          </button>

          <button
            onClick={() => setBucketFilter('moderate')}
            style={{
              padding: '5px 11px',
              fontSize: 11.5,
              fontWeight: 600,
              borderRadius: 6,
              background: bucketFilter === 'moderate' ? 'rgba(245, 158, 11, 0.2)' : 'var(--pill-bg)',
              color: bucketFilter === 'moderate' ? '#fbbf24' : 'var(--text-secondary)',
              border: `1px solid ${bucketFilter === 'moderate' ? '#f59e0b' : 'var(--pill-border)'}`,
              cursor: 'pointer',
            }}
          >
            Attention 31–60d ({counts.moderate})
          </button>

          <button
            onClick={() => setBucketFilter('current')}
            style={{
              padding: '5px 11px',
              fontSize: 11.5,
              fontWeight: 600,
              borderRadius: 6,
              background: bucketFilter === 'current' ? 'rgba(16, 185, 129, 0.2)' : 'var(--pill-bg)',
              color: bucketFilter === 'current' ? '#34d399' : 'var(--text-secondary)',
              border: `1px solid ${bucketFilter === 'current' ? '#10b981' : 'var(--pill-border)'}`,
              cursor: 'pointer',
            }}
          >
            Current Terms ({counts.current})
          </button>
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', minWidth: 240 }}>
          <input
            type="text"
            placeholder="Search by customer name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '7px 12px',
              fontSize: 12,
              background: 'var(--bg-input)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {actionFeedback && (
        <div
          style={{
            margin: '12px 20px',
            padding: '8px 12px',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: 6,
            color: '#34d399',
            fontSize: 12,
          }}
        >
          {actionFeedback}
        </div>
      )}

      {/* Table Container */}
      <div className="card-body" style={{ padding: 0 }}>
        <div className="table-container">
          <table className="data-table" style={{ fontSize: 12.5 }}>
            <thead>
              <tr>
                <th style={{ width: '22%' }}>Customer Account</th>
                <th style={{ textAlign: 'center', width: '7%' }}>Invoices</th>
                <th style={{ textAlign: 'right', width: '13%' }}>Total Balance</th>
                <th style={{ textAlign: 'center', width: '16%' }}>Aging Distribution</th>
                <th style={{ textAlign: 'right', width: '10%' }}>Current (&lt;30d)</th>
                <th style={{ textAlign: 'right', width: '10%' }}>31–60d</th>
                <th style={{ textAlign: 'right', width: '10%' }}>61–90d</th>
                <th style={{ textAlign: 'right', width: '10%' }}>90+ Days</th>
                <th style={{ textAlign: 'right', width: '12%' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {displayedRows.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    No customer accounts match the current filter criteria.
                  </td>
                </tr>
              ) : (
                displayedRows.map((row) => {
                  const sev = arSeverity(row);
                  const tot = row.total || 1;
                  const curPct = ((row.current || 0) / tot) * 100;
                  const p30Pct = ((row.days_31_60 || 0) / tot) * 100;
                  const p60Pct = ((row.days_61_90 || 0) / tot) * 100;
                  const p90Pct = ((row.days_90_plus || 0) / tot) * 100;

                  return (
                    <tr key={row.customer_id} className={`ar-severity-${sev}`}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <strong style={{ color: 'var(--text-primary)', fontSize: 13 }}>
                              {row.customer_name || row.customer_id}
                            </strong>
                            {row.plan && (
                              <span
                                style={{
                                  fontSize: 9.5,
                                  fontWeight: 700,
                                  padding: '1px 5px',
                                  borderRadius: 3,
                                  background: 'var(--pill-bg)',
                                  color: 'var(--text-secondary)',
                                }}
                              >
                                {row.plan}
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {row.customer_id} {row.customer_email ? `· ${row.customer_email}` : ''}
                          </span>
                        </div>
                      </td>

                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{row.invoices}</td>

                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)', fontSize: 13 }}>
                        {fmt_usd(row.total)}
                      </td>

                      {/* Aging Distribution Mini Bar */}
                      <td style={{ verticalAlign: 'middle', padding: '10px 14px' }}>
                        <div
                          style={{
                            height: 7,
                            background: 'var(--track-bg)',
                            borderRadius: 3.5,
                            display: 'flex',
                            overflow: 'hidden',
                            gap: 1,
                          }}
                        >
                          {curPct > 0 && <div style={{ width: `${curPct}%`, background: '#10b981' }} title={`Current: ${fmt_usd(row.current)}`} />}
                          {p30Pct > 0 && <div style={{ width: `${p30Pct}%`, background: '#f59e0b' }} title={`31-60d: ${fmt_usd(row.days_31_60)}`} />}
                          {p60Pct > 0 && <div style={{ width: `${p60Pct}%`, background: '#f97316' }} title={`61-90d: ${fmt_usd(row.days_61_90)}`} />}
                          {p90Pct > 0 && <div style={{ width: `${p90Pct}%`, background: '#f43f5e' }} title={`90+d: ${fmt_usd(row.days_90_plus)}`} />}
                        </div>
                      </td>

                      <td style={{ textAlign: 'right', color: row.current > 0 ? '#10b981' : 'var(--text-muted)' }}>
                        {row.current > 0 ? fmt_usd(row.current) : '—'}
                      </td>
                      <td style={{ textAlign: 'right', color: row.days_31_60 > 0 ? '#f59e0b' : 'var(--text-muted)' }}>
                        {row.days_31_60 > 0 ? fmt_usd(row.days_31_60) : '—'}
                      </td>
                      <td style={{ textAlign: 'right', color: row.days_61_90 > 0 ? '#f97316' : 'var(--text-muted)' }}>
                        {row.days_61_90 > 0 ? fmt_usd(row.days_61_90) : '—'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: row.days_90_plus > 0 ? 700 : 400, color: row.days_90_plus > 0 ? '#f43f5e' : 'var(--text-muted)' }}>
                        {row.days_90_plus > 0 ? fmt_usd(row.days_90_plus) : '—'}
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        {sev === 'critical' ? (
                          <button
                            onClick={() => handleAction(row.customer_name || row.customer_id, 'Legal Demand Notice')}
                            style={{
                              padding: '4px 8px',
                              fontSize: 11,
                              fontWeight: 600,
                              background: 'rgba(244, 63, 94, 0.15)',
                              color: '#fb7185',
                              border: '1px solid rgba(244, 63, 94, 0.3)',
                              borderRadius: 4,
                              cursor: 'pointer',
                            }}
                          >
                            Demand
                          </button>
                        ) : sev === 'elevated' ? (
                          <button
                            onClick={() => handleAction(row.customer_name || row.customer_id, 'Collector Call Notice')}
                            style={{
                              padding: '4px 8px',
                              fontSize: 11,
                              fontWeight: 600,
                              background: 'rgba(249, 115, 22, 0.15)',
                              color: '#fb923c',
                              border: '1px solid rgba(249, 115, 22, 0.3)',
                              borderRadius: 4,
                              cursor: 'pointer',
                            }}
                          >
                            Call Rep
                          </button>
                        ) : sev === 'moderate' ? (
                          <button
                            onClick={() => handleAction(row.customer_name || row.customer_id, 'Dunning Reminder Email')}
                            style={{
                              padding: '4px 8px',
                              fontSize: 11,
                              fontWeight: 600,
                              background: 'rgba(245, 158, 11, 0.15)',
                              color: '#fbbf24',
                              border: '1px solid rgba(245, 158, 11, 0.3)',
                              borderRadius: 4,
                              cursor: 'pointer',
                            }}
                          >
                            Remind
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAction(row.customer_name || row.customer_id, 'Send Statement')}
                            style={{
                              padding: '4px 8px',
                              fontSize: 11,
                              fontWeight: 600,
                              background: 'var(--pill-bg)',
                              color: 'var(--text-secondary)',
                              border: '1px solid var(--pill-border)',
                              borderRadius: 4,
                              cursor: 'pointer',
                            }}
                          >
                            Statement
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer with pagination and legend */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
            fontSize: 11.5,
          }}
        >
          {/* Severity Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Aging Severity:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: '#10b981' }} />
              <span style={{ color: 'var(--text-muted)' }}>Current (&lt;30d)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: '#f59e0b' }} />
              <span style={{ color: 'var(--text-muted)' }}>31–60d</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: '#f97316' }} />
              <span style={{ color: 'var(--text-muted)' }}>61–90d</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: '#f43f5e' }} />
              <span style={{ color: 'var(--text-muted)' }}>90+ Days</span>
            </div>
          </div>

          {/* Showing X of Y with Page Size Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: 'var(--text-muted)' }}>
              Showing {displayedRows.length} of {filtered.length} accounts
            </span>
            {filtered.length > pageSize && (
              <button
                onClick={() => setPageSize((prev) => prev + 25)}
                style={{
                  padding: '4px 10px',
                  fontSize: 11,
                  fontWeight: 600,
                  background: 'var(--pill-bg)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
              >
                Load More
              </button>
            )}
            {pageSize > 25 && (
              <button
                onClick={() => setPageSize(25)}
                style={{
                  padding: '4px 10px',
                  fontSize: 11,
                  fontWeight: 600,
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
