import { fmt_usd } from '../../lib/api';
import type { CashflowScenarios } from './useCashflow';

interface ScenarioMatrixCardProps {
  scenarios: CashflowScenarios;
}

export const ScenarioMatrixCard = ({ scenarios }: ScenarioMatrixCardProps) => {
  const worst = scenarios.worst_case;
  const base = scenarios.base_case;
  const best = scenarios.best_case;

  return (
    <div className="card animate-in stagger-4" style={{ height: '100%' }}>
      <div className="card-header">
        <div>
          <span className="card-title">Cash Runway &amp; Scenario Sensitivity Projections</span>
          <span className="card-subtitle" style={{ display: 'block' }}>
            Machine learning quantile simulation: Best-Case (P90), Base-Case (P50), and Stress-Tested Worst-Case (P10)
          </span>
        </div>
      </div>

      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 16,
          }}
        >
          {/* Card 1: Worst-Case Scenario */}
          <div
            style={{
              padding: '18px 20px',
              background: 'linear-gradient(180deg, rgba(38, 20, 26, 0.65) 0%, rgba(20, 12, 16, 0.85) 100%)',
              border: '1px solid rgba(244, 63, 94, 0.28)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              boxShadow: 'inset 0 1px 0 0 rgba(244, 63, 94, 0.15)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#fb7185' }}>
                Worst-Case (P10)
              </span>
              <span className="badge-pill low" style={{ fontSize: 10 }}>
                Stress Test
              </span>
            </div>

            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Projected Runway Horizon
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#f87171', fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
                {worst.runway_days >= 365 ? '365+ Days' : `${worst.runway_days} Days`}
              </div>
            </div>

            <div style={{ borderTop: '1px solid rgba(244, 63, 94, 0.15)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>90D Ending Cash:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>
                  {fmt_usd(worst.ending_cash_90d)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>90D Net Delta:</span>
                <span style={{ fontWeight: 600, color: worst.net_change_90d >= 0 ? 'var(--green)' : 'var(--red)', fontFamily: "'JetBrains Mono', monospace" }}>
                  {worst.net_change_90d >= 0 ? '+' : ''}{fmt_usd(worst.net_change_90d)}
                </span>
              </div>
            </div>

            <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4, marginTop: 4 }}>
              Assumes collections slow by 20%, payment disputes rise, and cash burn peaks.
            </div>
          </div>

          {/* Card 2: Base-Case Scenario */}
          <div
            style={{
              padding: '18px 20px',
              background: 'linear-gradient(180deg, rgba(20, 28, 48, 0.65) 0%, rgba(13, 18, 32, 0.85) 100%)',
              border: '1px solid rgba(59, 130, 246, 0.35)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              boxShadow: 'inset 0 1px 0 0 rgba(59, 130, 246, 0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#60a5fa' }}>
                Base-Case (P50)
              </span>
              <span className="badge-pill" style={{ background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#93c5fd', fontSize: 10 }}>
                Expected Median
              </span>
            </div>

            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Projected Runway Horizon
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#38bdf8', fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
                {base.runway_days >= 365 ? '365+ Days' : `${base.runway_days} Days`}
              </div>
            </div>

            <div style={{ borderTop: '1px solid rgba(59, 130, 246, 0.15)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>90D Ending Cash:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>
                  {fmt_usd(base.ending_cash_90d)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>90D Net Delta:</span>
                <span style={{ fontWeight: 600, color: base.net_change_90d >= 0 ? 'var(--green)' : 'var(--red)', fontFamily: "'JetBrains Mono', monospace" }}>
                  {base.net_change_90d >= 0 ? '+' : ''}{fmt_usd(base.net_change_90d)}
                </span>
              </div>
            </div>

            <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4, marginTop: 4 }}>
              Maintains current run rate of invoice realizations and steady operational cash inflows.
            </div>
          </div>

          {/* Card 3: Best-Case Scenario */}
          <div
            style={{
              padding: '18px 20px',
              background: 'linear-gradient(180deg, rgba(18, 36, 28, 0.65) 0%, rgba(12, 22, 18, 0.85) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.32)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              boxShadow: 'inset 0 1px 0 0 rgba(16, 185, 129, 0.18)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#34d399' }}>
                Best-Case (P90)
              </span>
              <span className="badge-pill high" style={{ fontSize: 10 }}>
                Optimistic Growth
              </span>
            </div>

            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Projected Runway Horizon
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#34d399', fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
                {best.runway_days >= 365 ? '365+ Days' : `${best.runway_days} Days`}
              </div>
            </div>

            <div style={{ borderTop: '1px solid rgba(16, 185, 129, 0.15)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>90D Ending Cash:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>
                  {fmt_usd(best.ending_cash_90d)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>90D Net Delta:</span>
                <span style={{ fontWeight: 600, color: 'var(--green)', fontFamily: "'JetBrains Mono', monospace" }}>
                  +{fmt_usd(best.net_change_90d)}
                </span>
              </div>
            </div>

            <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4, marginTop: 4 }}>
              Accelerated invoice collections (+15%), low refund rate, and enhanced capital retention.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
