import { fmt_usd } from '../../lib/api';
import type { DebtCapitalStructure, CfoForecasting } from './useRevenue';

interface DebtCapitalStructureCardProps {
  debt: DebtCapitalStructure;
  forecasting: CfoForecasting;
}

export const DebtCapitalStructureCard = ({
  debt,
  forecasting,
}: DebtCapitalStructureCardProps) => {
  return (
    <div className="card animate-in stagger-4" style={{ height: '100%' }}>
      <div className="card-header">
        <div>
          <span className="card-title">Debt Management &amp; Strategic Forecasting</span>
          <span className="card-subtitle" style={{ display: 'block' }}>
            Balance sheet leverage ratios, credit line headroom, and forward multi-quarter financial targets
          </span>
        </div>
      </div>

      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* 4-Stat Capital Structure Matrix */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 12,
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
              Debt-to-Equity (D/E)
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--green)', marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
              {debt.debt_to_equity_ratio}x
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
              Industry benchmark &lt; 1.5x
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
              Interest Coverage
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--green)', marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
              {debt.interest_coverage_ratio}x
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
              EBITDA coverage ratio
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
              Funded Debt / Facility
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
              {fmt_usd(debt.total_debt_usd)}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
              {fmt_usd(debt.credit_facility_capacity_usd)} authorized capacity
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
              Quick Liquidity Ratio
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent)', marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
              {debt.quick_ratio}x
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
              Immediate liquidity buffer
            </div>
          </div>
        </div>

        {/* Strategic Guidance & Multi-Quarter Targets */}
        <div
          style={{
            padding: '14px 16px',
            background: 'rgba(59, 130, 246, 0.03)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Forward Financial Guidance &amp; Targets
            </span>
            <span className="badge-pill high" style={{ fontSize: 10 }}>
              {forecasting.confidence_interval}
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 12,
              marginTop: 4,
            }}
          >
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Forward Q+1 Target:</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>
                {fmt_usd(forecasting.q1_projected_revenue)} Rev · {fmt_usd(forecasting.q1_projected_income)} EBIT
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Forward Q+2 Target:</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>
                {fmt_usd(forecasting.q2_projected_revenue)} Rev · {fmt_usd(forecasting.q2_projected_income)} EBIT
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Operating Target:</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--green)', fontFamily: "'JetBrains Mono', monospace" }}>
                {forecasting.target_operating_margin_pct}% Margin ({forecasting.projected_cagr_pct}% CAGR)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

