import type { AnomalyFlag } from './useOps';

interface AnomalyDetectionCardProps {
  anomalies: AnomalyFlag[];
  healthScore: number;
  status: string;
}

export const AnomalyDetectionCard = ({
  anomalies,
  healthScore,
  status,
}: AnomalyDetectionCardProps) => {
  return (
    <div className="card animate-in stagger-2" style={{ height: '100%' }}>
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
          <span className="card-title">AI Anomaly Detection &amp; Neural Monitoring</span>
          <span className="card-subtitle" style={{ display: 'block' }}>
            Continuous pattern surveillance across payment rails, issuer clearing, and velocity thresholds
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="demo-badge">
            <span className="demo-dot" />
            <span>{status} ({healthScore}/100)</span>
          </div>
        </div>
      </div>

      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {anomalies.length === 0 ? (
          <div className="empty-state" style={{ padding: '30px 12px' }}>
            <div className="empty-state-title">No Active Anomalies Detected</div>
            <div className="empty-state-desc">All transaction streams and clearing rails are operating within baseline tolerances.</div>
          </div>
        ) : (
          anomalies.map((anom) => {
            const isHigh = anom.severity === 'high';
            const isMed = anom.severity === 'medium';
            const badgeClass = isHigh ? 'low' : isMed ? 'med' : 'high';
            const borderTint = isHigh
              ? 'rgba(244, 63, 94, 0.3)'
              : isMed
              ? 'rgba(245, 158, 11, 0.25)'
              : 'rgba(59, 130, 246, 0.2)';
            const bgTint = isHigh
              ? 'rgba(244, 63, 94, 0.04)'
              : isMed
              ? 'rgba(245, 158, 11, 0.04)'
              : 'rgba(59, 130, 246, 0.03)';

            return (
              <div
                key={anom.id}
                style={{
                  padding: '12px 14px',
                  background: bgTint,
                  border: `1px solid ${borderTint}`,
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {anom.title}
                    </span>
                    <span className={`badge-pill ${badgeClass}`} style={{ fontSize: 10, textTransform: 'uppercase' }}>
                      {anom.type}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
                    <span style={{ color: 'var(--text-muted)' }}>{anom.detected_at}</span>
                    <span className="badge-pill high" style={{ fontSize: 10 }}>
                      {anom.confidence}% Confidence
                    </span>
                  </div>
                </div>

                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                  {anom.description}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, marginTop: 2, borderTop: '1px solid var(--border)', paddingTop: 6 }}>
                  <span style={{ color: 'var(--text-muted)' }}>
                    Affected Rail: <strong style={{ color: 'var(--text-primary)' }}>{anom.affected_rail}</strong>
                  </span>
                  <span style={{ color: 'var(--green)', fontWeight: 600 }}>
                    Status: {anom.status}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

