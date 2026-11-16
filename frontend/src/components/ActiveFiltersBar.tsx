import React from 'react';
import { useCrossFilter, type FilterState } from '../lib/CrossFilterContext';
import { formatDimensionLabel } from '../lib/crossFilterUtils';

const DIMENSION_CONFIG: Record<keyof FilterState, { label: string; icon: string }> = {
  productLine: { label: 'Product', icon: '📦' },
  month: { label: 'Month', icon: '📅' },
  department: { label: 'Department', icon: '🏢' },
  customerTier: { label: 'Tier', icon: '👥' },
  agingBucket: { label: 'AR Bucket', icon: '⏱️' },
  declineCode: { label: 'Decline Reason', icon: '⚠️' },
  date: { label: 'Date', icon: '📆' },
};

export const ActiveFiltersBar: React.FC = () => {
  const { filters, activeFilterCount, hasActiveFilters, clearFilter, resetAll } = useCrossFilter();

  if (!hasActiveFilters) {
    return null;
  }

  const activeEntries = (Object.entries(filters) as [keyof FilterState, string | null][]).filter(
    ([, val]) => val !== null && val !== ''
  );

  return (
    <div
      className="animate-in"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        padding: '10px 16px',
        background: 'var(--card-bg)',
        border: '1px solid var(--accent)',
        borderRadius: 'var(--radius-md, 8px)',
        boxShadow: '0 4px 16px rgba(59, 130, 246, 0.08)',
        marginBottom: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: 'var(--accent)',
              color: '#ffffff',
              fontSize: 10.5,
              fontWeight: 800,
            }}
          >
            {activeFilterCount}
          </span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.3px',
              textTransform: 'uppercase',
              color: 'var(--accent)',
            }}
          >
            Cross-Filter Active
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>·</span>
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          {activeEntries.map(([key, val]) => {
            const config = DIMENSION_CONFIG[key] || { label: key, icon: '🔍' };
            const displayVal = formatDimensionLabel(key, val!);
            return (
              <span
                key={key}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 10px',
                  background: 'var(--accent-soft)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: 'var(--radius-sm, 6px)',
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}
              >
                <span style={{ fontSize: 11 }}>{config.icon}</span>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                  {config.label}:
                </span>
                <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{displayVal}</span>
                <button
                  type="button"
                  onClick={() => clearFilter(key)}
                  title={`Clear ${config.label} filter`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: 0,
                    marginLeft: 2,
                    fontSize: 12,
                    lineHeight: 1,
                    transition: 'color 0.15s ease',
                  }}
                  onMouseEnter={(e) => ((e.target as HTMLElement).style.color = 'var(--red, #ef4444)')}
                  onMouseLeave={(e) =>
                    ((e.target as HTMLElement).style.color = 'var(--text-muted)')
                  }
                >
                  ✕
                </button>
              </span>
            );
          })}
        </div>
      </div>

      {/* Clear All / Esc Button */}
      <button
        type="button"
        onClick={resetAll}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 12px',
          background: 'transparent',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-sm, 6px)',
          fontSize: 11.5,
          fontWeight: 600,
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = 'var(--red, #ef4444)';
          (e.currentTarget as HTMLElement).style.color = 'var(--red, #ef4444)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-color)';
          (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
        }}
      >
        <span>✕ Reset All</span>
        <kbd
          style={{
            fontSize: 9.5,
            padding: '1px 5px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 3,
            color: 'var(--text-muted)',
          }}
        >
          Esc
        </kbd>
      </button>
    </div>
  );
};

export default ActiveFiltersBar;
