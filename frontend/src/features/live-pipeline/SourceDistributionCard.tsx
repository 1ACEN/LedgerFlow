import React, { useMemo } from 'react';

interface SourceDistributionCardProps {
  bySource: Record<string, number>;
}

export const SourceDistributionCard: React.FC<SourceDistributionCardProps> = ({ bySource }) => {
  const { entries, maxVal } = useMemo(() => {
    const list = Object.entries(bySource).sort((a, b) => b[1] - a[1]);
    const max = list[0]?.[1] || 1;
    return { entries: list, maxVal: max };
  }, [bySource]);

  return (
    <div className="card animate-in stagger-3">
      <div className="card-header">
        <div className="card-icon green">📊</div>
        <div>
          <span className="card-title">Ledger Source Distribution</span>
          <span className="card-subtitle" style={{ display: 'block' }}>
            Event volume breakdown by payment provider & rail
          </span>
        </div>
      </div>
      <div className="card-body">
        {entries.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📡</div>
            <div className="empty-state-title">Loading sources…</div>
          </div>
        ) : (
          <div className="source-list" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {entries.map(([src, cnt]) => {
              const pct = Math.round((cnt / maxVal) * 100);
              return (
                <div
                  key={src}
                  className="source-row"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    fontSize: 12,
                  }}
                >
                  <span
                    className="source-name"
                    style={{
                      width: 110,
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      textTransform: 'capitalize',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {src.replace(/_/g, ' ')}
                  </span>
                  <div
                    className="source-bar-track"
                    style={{
                      flex: 1,
                      height: 8,
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: 4,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      className="source-bar"
                      style={{
                        width: `${pct}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, var(--accent), var(--purple))',
                        borderRadius: 4,
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>
                  <span
                    className="source-count"
                    style={{
                      width: 65,
                      textAlign: 'right',
                      fontWeight: 600,
                      fontFamily: "'JetBrains Mono', monospace",
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {cnt.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
