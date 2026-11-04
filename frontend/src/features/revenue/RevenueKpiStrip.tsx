import { fmt_usd } from '../../lib/api';
import type { RevenueKpis } from './useRevenue';

interface Props {
  kpis: RevenueKpis;
  loading?: boolean;
}

export default function RevenueKpiStrip({ kpis, loading }: Props) {
  if (loading) {
    return (
      <div className="grid-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="metric-card skeleton-card" style={{ padding: '20px 22px' }}>
            <div className="skeleton skeleton-text" style={{ width: '50%', marginBottom: 12 }} />
            <div className="skeleton skeleton-text" style={{ width: '80%', height: 34, marginBottom: 8 }} />
            <div className="skeleton skeleton-text" style={{ width: '60%' }} />
          </div>
        ))}
      </div>
    );
  }

  const isMomPositive = kpis.momGrowth >= 0;
  const isNetPositive = kpis.netProfit >= 0;
  const isCashFlowPositive = kpis.cashFlow30d >= 0;

  return (
    <div className="revenue-kpi-container" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* 5 Core Strategic CFO Hero Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 14,
        }}
      >
        {/* Card 1: Total Revenue (TTM) */}
        <div
          className="metric-card animate-in stagger-1"
          style={{
            padding: '20px 22px',
            background: 'linear-gradient(180deg, rgba(20, 28, 48, 0.75) 0%, rgba(13, 18, 32, 0.9) 100%)',
            border: '1px solid rgba(59, 130, 246, 0.22)',
            boxShadow: 'inset 0 1px 0 0 rgba(59, 130, 246, 0.12), var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="metric-label" style={{ color: 'var(--text-secondary)' }}>
              Total Revenue (TTM)
            </span>
            <span
              className={`badge-pill ${isMomPositive ? 'high' : 'med'}`}
              style={{ fontSize: 10, padding: '2px 8px' }}
            >
              {isMomPositive ? '+' : ''}{kpis.momGrowth}% MoM
            </span>
          </div>
          <div
            className="metric-value"
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: '#60a5fa',
              fontFamily: "'JetBrains Mono', monospace",
              margin: '3px 0',
            }}
          >
            {fmt_usd(kpis.totalRevenue)}
          </div>
          <div className="metric-sub" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5 }}>
            <span style={{ color: 'var(--text-muted)' }}>Gross Invoiced Volume</span>
            <span style={{ color: 'var(--text-secondary)' }}>
              Net: {fmt_usd(kpis.netRevenue)}
            </span>
          </div>
        </div>

        {/* Card 2: Net Profit (TTM) */}
        <div
          className="metric-card animate-in stagger-2"
          style={{
            padding: '20px 22px',
            background: 'linear-gradient(180deg, rgba(18, 36, 28, 0.75) 0%, rgba(12, 22, 18, 0.9) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.24)',
            boxShadow: 'inset 0 1px 0 0 rgba(16, 185, 129, 0.12), var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="metric-label" style={{ color: 'var(--text-secondary)' }}>
              Net Profit (TTM)
            </span>
            <span className={`badge-pill ${isNetPositive ? 'high' : 'low'}`} style={{ fontSize: 10 }}>
              {kpis.netMarginPct}% Margin
            </span>
          </div>
          <div
            className="metric-value"
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: isNetPositive ? '#34d399' : '#f87171',
              fontFamily: "'JetBrains Mono', monospace",
              margin: '3px 0',
            }}
          >
            {fmt_usd(kpis.netProfit)}
          </div>
          <div className="metric-sub" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5 }}>
            <span style={{ color: 'var(--text-muted)' }}>Post-Tax Bottom Line</span>
            <span style={{ color: isNetPositive ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
              {isNetPositive ? 'Net Profitable' : 'Deficit'}
            </span>
          </div>
        </div>

        {/* Card 3: Operating Margin & EBIT */}
        <div
          className="metric-card animate-in stagger-3"
          style={{
            padding: '20px 22px',
            background: 'linear-gradient(180deg, rgba(25, 28, 45, 0.75) 0%, rgba(15, 17, 30, 0.9) 100%)',
            border: '1px solid rgba(139, 92, 246, 0.22)',
            boxShadow: 'inset 0 1px 0 0 rgba(139, 92, 246, 0.12), var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="metric-label" style={{ color: 'var(--text-secondary)' }}>
              Operating Income (EBIT)
            </span>
            <span className="badge-pill high" style={{ fontSize: 10 }}>
              {kpis.operatingMarginPct}% Op Margin
            </span>
          </div>
          <div
            className="metric-value"
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: '#c084fc',
              fontFamily: "'JetBrains Mono', monospace",
              margin: '3px 0',
            }}
          >
            {fmt_usd(kpis.operatingIncome)}
          </div>
          <div className="metric-sub" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5 }}>
            <span style={{ color: 'var(--text-muted)' }}>Core Operating Profit</span>
            <span style={{ color: 'var(--text-secondary)' }}>EBITDA Accretive</span>
          </div>
        </div>

        {/* Card 4: Gross Profit Margin */}
        <div
          className="metric-card animate-in stagger-4"
          style={{
            padding: '20px 22px',
            background: 'linear-gradient(180deg, rgba(35, 28, 20, 0.75) 0%, rgba(22, 17, 13, 0.9) 100%)',
            border: '1px solid rgba(245, 158, 11, 0.22)',
            boxShadow: 'inset 0 1px 0 0 rgba(245, 158, 11, 0.12), var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="metric-label" style={{ color: 'var(--text-secondary)' }}>
              Gross Profit Margin
            </span>
            <span className="badge-pill high" style={{ fontSize: 10 }}>
              Tier-1 SaaS
            </span>
          </div>
          <div
            className="metric-value"
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: '#fbbf24',
              fontFamily: "'JetBrains Mono', monospace",
              margin: '3px 0',
            }}
          >
            {kpis.grossMarginPct}%
          </div>
          <div className="metric-sub" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5 }}>
            <span style={{ color: 'var(--text-muted)' }}>Net ÷ Gross Invoiced</span>
            <span style={{ color: 'var(--text-secondary)' }}>
              COGS: {fmt_usd(kpis.totalRevenue - kpis.netRevenue)}
            </span>
          </div>
        </div>

        {/* Card 5: Net Cash Flow (30D) */}
        <div
          className="metric-card animate-in stagger-4"
          style={{
            padding: '20px 22px',
            background: 'linear-gradient(180deg, rgba(26, 32, 42, 0.75) 0%, rgba(15, 20, 28, 0.9) 100%)',
            border: '1px solid rgba(14, 165, 233, 0.22)',
            boxShadow: 'inset 0 1px 0 0 rgba(14, 165, 233, 0.12), var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="metric-label" style={{ color: 'var(--text-secondary)' }}>
              Net Cash Flow (30D)
            </span>
            <span className={`badge-pill ${isCashFlowPositive ? 'high' : 'low'}`} style={{ fontSize: 10 }}>
              {isCashFlowPositive ? 'Accretive' : 'Burn'}
            </span>
          </div>
          <div
            className="metric-value"
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: isCashFlowPositive ? '#38bdf8' : '#f87171',
              fontFamily: "'JetBrains Mono', monospace",
              margin: '3px 0',
            }}
          >
            {isCashFlowPositive ? '+' : ''}{fmt_usd(kpis.cashFlow30d)}
          </div>
          <div className="metric-sub" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5 }}>
            <span style={{ color: 'var(--text-muted)' }}>Treasury Velocity</span>
            <span style={{ color: 'var(--text-secondary)' }}>Operating generation</span>
          </div>
        </div>
      </div>

      {/* Strategic Corporate Telemetry Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: 12,
          padding: '12px 18px',
          background: 'rgba(14, 19, 31, 0.75)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)',
          fontSize: 12,
          color: 'var(--text-secondary)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--text-muted)' }}>OpEx (TTM):</span>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>
            {fmt_usd(kpis.operatingExpenses)}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--text-muted)' }}>Debt-to-Equity (D/E):</span>
          <span style={{ fontWeight: 700, color: 'var(--green)', fontFamily: "'JetBrains Mono', monospace" }}>
            {kpis.debtStructure.debt_to_equity_ratio}x
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--text-muted)' }}>Interest Coverage:</span>
          <span style={{ fontWeight: 700, color: 'var(--green)', fontFamily: "'JetBrains Mono', monospace" }}>
            {kpis.debtStructure.interest_coverage_ratio}x
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--text-muted)' }}>Forward Q+1 Revenue:</span>
          <span style={{ fontWeight: 600, color: 'var(--accent)', fontFamily: "'JetBrains Mono', monospace" }}>
            {fmt_usd(kpis.forecasting.q1_projected_revenue)}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
          <span style={{ color: 'var(--text-muted)' }}>Capital Structure:</span>
          <span className="badge-pill high" style={{ fontSize: 10 }}>
            {kpis.debtStructure.capital_structure_status}
          </span>
        </div>
      </div>
    </div>
  );
}
