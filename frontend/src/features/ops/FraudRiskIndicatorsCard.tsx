import { fmt_usd } from '../../lib/api';
import type { FraudRiskIndicators } from './useOps';

interface FraudRiskIndicatorsCardProps {
  fraud: FraudRiskIndicators;
}

export const FraudRiskIndicatorsCard = ({ fraud }: FraudRiskIndicatorsCardProps) => {
  const totalEvaluated = fraud.normal_count + fraud.elevated_risk_count + fraud.highest_risk_count || 1;
  const normalPct = ((fraud.normal_count / totalEvaluated) * 100).toFixed(1);
  const elevatedPct = ((fraud.elevated_risk_count / totalEvaluated) * 100).toFixed(1);
  const highestPct = ((fraud.highest_risk_count / totalEvaluated) * 100).toFixed(1);

  const isDisputeRateSafe = fraud.dispute_rate_bps < 90;

  return (
    <div className="card animate-in stagger-3" style={{ height: '100%' }}>
      <div className="card-header">
        <div>
          <span className="card-title">Fraud Risk Classification &amp; Dispute Defense</span>
          <span className="card-subtitle" style={{ display: 'block' }}>
            ML score distribution, network chargeback thresholds, and automated dispute resolution
          </span>
        </div>
      </div>

      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* ML Risk Score Segmentation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Transaction Risk Scoring Breakdown
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              {totalEvaluated.toLocaleString()} evaluated
            </span>
          </div>

          {/* Segmented Gradient Bar */}
          <div
            style={{
              height: 10,
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: 5,
              display: 'flex',
              overflow: 'hidden',
              gap: 2,
            }}
          >
            <div
              title={`Normal: ${normalPct}%`}
              style={{
                width: `${normalPct}%`,
                background: '#10b981',
              }}
            />
            <div
              title={`Elevated Risk: ${elevatedPct}%`}
              style={{
                width: `${elevatedPct}%`,
                background: '#f59e0b',
              }}
            />
            <div
              title={`Highest Risk: ${highestPct}%`}
              style={{
                width: `${highestPct}%`,
                background: '#f43f5e',
              }}
            />
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: '#10b981', display: 'inline-block' }} />
              <span style={{ color: 'var(--text-secondary)' }}>Normal ({normalPct}%)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: '#f59e0b', display: 'inline-block' }} />
              <span style={{ color: 'var(--text-secondary)' }}>Elevated ({elevatedPct}%)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: '#f43f5e', display: 'inline-block' }} />
              <span style={{ color: 'var(--text-secondary)' }}>Highest Risk ({highestPct}%)</span>
            </div>
          </div>
        </div>

        {/* Card Network & Dispute Health Matrix */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
            paddingTop: 10,
            borderTop: '1px solid var(--border)',
          }}
        >
          <div
            style={{
              padding: '12px 14px',
              background: 'rgba(255, 255, 255, 0.025)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Network Dispute Rate
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: isDisputeRateSafe ? 'var(--green)' : 'var(--red)', marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
              {fraud.dispute_rate_bps} bps
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
              {isDisputeRateSafe ? 'Safely below 90 bps threshold' : 'Exceeds network threshold'}
            </div>
          </div>

          <div
            style={{
              padding: '12px 14px',
              background: 'rgba(255, 255, 255, 0.025)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Representment Win Rate
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--green)', marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
              {fraud.win_rate_pct}%
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
              {fraud.disputes_won_count} won vs {fraud.disputes_lost_count} lost
            </div>
          </div>

          <div
            style={{
              padding: '12px 14px',
              background: 'rgba(255, 255, 255, 0.025)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Dispute Exposure
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--yellow)', marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
              {fmt_usd(fraud.total_dispute_amount_usd)}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
              {fraud.active_disputes_count} active under review
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
