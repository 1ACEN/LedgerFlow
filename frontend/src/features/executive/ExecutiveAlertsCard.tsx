import React from 'react';
import type { ExecutiveAlert } from './useExecutive';

interface ExecutiveAlertsCardProps {
  alerts: ExecutiveAlert[];
}

export const ExecutiveAlertsCard: React.FC<ExecutiveAlertsCardProps> = ({ alerts }) => {
  return (
    <div className="card animate-in stagger-4" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="card-header">
        <div>
          <span className="card-title">Executive Decision Highlights &amp; Alerts</span>
          <span className="card-subtitle" style={{ display: 'block' }}>
            Actionable telemetry and business warnings
          </span>
        </div>
      </div>
      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 16 }}>
        {alerts.length === 0 ? (
          <div className="empty-state" style={{ padding: '24px 12px' }}>
            <div className="empty-state-title">No Critical Operational Alerts</div>
            <div className="empty-state-desc">All financial indicators are currently operating within baseline variance.</div>
          </div>
        ) : (
          alerts.map((alert) => {
            const isPos = alert.type === 'positive';
            const isWarn = alert.type === 'warning';
            const isDanger = alert.type === 'danger';

            const badgeClass = isPos ? 'high' : isWarn ? 'med' : isDanger ? 'low' : 'med';
            const borderColor = isPos
              ? 'rgba(16, 185, 129, 0.25)'
              : isWarn
              ? 'rgba(245, 158, 11, 0.25)'
              : isDanger
              ? 'rgba(244, 63, 94, 0.25)'
              : 'var(--border)';

            const bgTint = isPos
              ? 'rgba(16, 185, 129, 0.04)'
              : isWarn
              ? 'rgba(245, 158, 11, 0.04)'
              : isDanger
              ? 'rgba(244, 63, 94, 0.05)'
              : 'var(--surface-subtle)';

            return (
              <div
                key={alert.id}
                style={{
                  padding: '12px 14px',
                  background: bgTint,
                  border: `1px solid ${borderColor}`,
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  transition: 'var(--transition)',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {alert.title}
                    </span>
                    <span className={`badge-pill ${badgeClass}`} style={{ fontSize: 10, textTransform: 'uppercase' }}>
                      {alert.type}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.45 }}>
                    {alert.message}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

