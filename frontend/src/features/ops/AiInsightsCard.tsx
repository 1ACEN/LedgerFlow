import type { AiInsight } from './useOps';

interface AiInsightsCardProps {
  insights: AiInsight[];
}

export const AiInsightsCard = ({ insights }: AiInsightsCardProps) => {
  return (
    <div className="card animate-in stagger-2" style={{ height: '100%' }}>
      <div className="card-header">
        <div>
          <span className="card-title">AI Autonomous Operations Recommendations</span>
          <span className="card-subtitle" style={{ display: 'block' }}>
            Predictive routing optimizations, decline recovery schedules, and revenue defense actions
          </span>
        </div>
      </div>

      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {insights.length === 0 ? (
          <div className="empty-state" style={{ padding: '30px 12px' }}>
            <div className="empty-state-title">No Pending Operational Recommendations</div>
            <div className="empty-state-desc">All payment pipelines and routing engines are running at optimal configuration.</div>
          </div>
        ) : (
          insights.map((ins) => {
            const isHigh = ins.priority === 'high';
            const badgeClass = isHigh ? 'high' : 'med';
            const borderColor = isHigh ? 'rgba(16, 185, 129, 0.28)' : 'rgba(59, 130, 246, 0.25)';
            const bgTint = isHigh ? 'rgba(16, 185, 129, 0.03)' : 'rgba(59, 130, 246, 0.03)';

            return (
              <div
                key={ins.id}
                style={{
                  padding: '12px 14px',
                  background: bgTint,
                  border: `1px solid ${borderColor}`,
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {ins.title}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        padding: '1px 6px',
                        borderRadius: 'var(--radius-xs)',
                        background: 'var(--pill-bg)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {ins.category}
                    </span>
                  </div>
                  <span className={`badge-pill ${badgeClass}`} style={{ fontSize: 10, textTransform: 'uppercase' }}>
                    {ins.priority} Priority
                  </span>
                </div>

                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Observation: </strong>
                  {ins.observation}
                </div>

                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Recommended Action: </strong>
                  {ins.recommendation}
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 11.5,
                    color: 'var(--green)',
                    fontWeight: 600,
                    borderTop: '1px solid var(--border)',
                    paddingTop: 6,
                    marginTop: 2,
                  }}
                >
                  <span>⚡ Projected Impact:</span>
                  <span>{ins.impact}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

