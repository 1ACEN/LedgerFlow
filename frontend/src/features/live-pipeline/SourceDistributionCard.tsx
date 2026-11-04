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
            <div className="empty-state-title">Loading sources…</div>
          </div>
        ) : (
          <div className="source-list">
            {entries.map(([src, cnt]) => {
              const pct = Math.round((cnt / maxVal) * 100);
              return (
                <div key={src} className="source-row">
                  <span className="source-name">
                    {src.replace(/_/g, ' ')}
                  </span>
                  <div className="source-bar-track">
                    <div
                      className="source-bar"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="source-count">
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
