import { fmt_usd } from '../../lib/api';
import type { CashflowKpis } from './useCashflow';

interface Props {
  kpis: CashflowKpis;
  loading?: boolean;
}

export default function CashflowKpiStrip({ kpis, loading }: Props) {
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

  const isNetPositive = kpis.netCashFlow30d >= 0;
  const isOperatingPositive = kpis.operatingCashFlow30d >= 0;
  const isFreePositive = kpis.freeCashFlow30d >= 0;

  return (
    <div className="cashflow-kpi-container" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* 5 Core Analytical Intelligence KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 14,
        }}
      >
        {/* Metric 1: Cash Reserves */}
        <div
          className="metric-card animate-in stagger-1"
          style={{
            padding: '20px 22px',
            background: 'linear-gradient(180deg, rgba(20, 28, 48, 0.75) 0%, rgba(13, 18, 32, 0.9) 100%)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            boxShadow: 'inset 0 1px 0 0 rgba(59, 130, 246, 0.12), var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="metric-label" style={{ color: 'var(--text-secondary)' }}>
              Cash Reserves
            </span>
            <span className="badge-pill high" style={{ fontSize: 10 }}>
              Liquid Buffer
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
            {fmt_usd(kpis.currentReserves)}
          </div>
          <div className="metric-sub" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5 }}>
            <span style={{ color: 'var(--text-muted)' }}>Treasury &amp; Operating</span>
            <span style={{ color: 'var(--text-secondary)' }}>
              {kpis.p50RunwayDays >= 365 ? '12+ mo runway' : `${kpis.p50RunwayDays}d runway`}
            </span>
          </div>
        </div>

        {/* Metric 2: Net Cash Flow (30D) */}
        <div
          className="metric-card animate-in stagger-2"
          style={{
            padding: '20px 22px',
            background: 'linear-gradient(180deg, rgba(22, 34, 30, 0.75) 0%, rgba(14, 22, 20, 0.9) 100%)',
            border: `1px solid ${isNetPositive ? 'rgba(16, 185, 129, 0.22)' : 'rgba(244, 63, 94, 0.22)'}`,
            boxShadow: 'inset 0 1px 0 0 rgba(16, 185, 129, 0.12), var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="metric-label" style={{ color: 'var(--text-secondary)' }}>
              Net Cash Flow (30D)
            </span>
            <span className={`badge-pill ${isNetPositive ? 'high' : 'low'}`} style={{ fontSize: 10 }}>
              {isNetPositive ? 'Net Surplus' : 'Net Deficit'}
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
            {isNetPositive ? '+' : ''}{fmt_usd(kpis.netCashFlow30d)}
          </div>
          <div className="metric-sub" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5 }}>
            <span style={{ color: 'var(--text-muted)' }}>Inflow vs Outflow Net</span>
            <span style={{ color: isNetPositive ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
              {isNetPositive ? 'Capital Accretive' : 'Capital Burn'}
            </span>
          </div>
        </div>

        {/* Metric 3: Operating Cash Flow (30D) */}
        <div
          className="metric-card animate-in stagger-3"
          style={{
            padding: '20px 22px',
            background: 'linear-gradient(180deg, rgba(25, 28, 45, 0.75) 0%, rgba(15, 17, 30, 0.9) 100%)',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            boxShadow: 'inset 0 1px 0 0 rgba(139, 92, 246, 0.12), var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="metric-label" style={{ color: 'var(--text-secondary)' }}>
              Operating Cash Flow
            </span>
            <span className="badge-pill high" style={{ fontSize: 10 }}>
              Core Ops
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
            {isOperatingPositive ? '+' : ''}{fmt_usd(kpis.operatingCashFlow30d)}
          </div>
          <div className="metric-sub" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5 }}>
            <span style={{ color: 'var(--text-muted)' }}>Charges less Direct Fees</span>
            <span style={{ color: 'var(--text-secondary)' }}>Operating generation</span>
          </div>
        </div>

        {/* Metric 4: Free Cash Flow (30D) */}
        <div
          className="metric-card animate-in stagger-4"
          style={{
            padding: '20px 22px',
            background: 'linear-gradient(180deg, rgba(26, 32, 42, 0.75) 0%, rgba(15, 20, 28, 0.9) 100%)',
            border: '1px solid rgba(14, 165, 233, 0.2)',
            boxShadow: 'inset 0 1px 0 0 rgba(14, 165, 233, 0.12), var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="metric-label" style={{ color: 'var(--text-secondary)' }}>
              Free Cash Flow (FCF)
            </span>
            <span className={`badge-pill ${isFreePositive ? 'high' : 'med'}`} style={{ fontSize: 10 }}>
              Post-Disbursement
            </span>
          </div>
          <div
            className="metric-value"
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: '#38bdf8',
              fontFamily: "'JetBrains Mono', monospace",
              margin: '3px 0',
            }}
          >
            {isFreePositive ? '+' : ''}{fmt_usd(kpis.freeCashFlow30d)}
          </div>
          <div className="metric-sub" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5 }}>
            <span style={{ color: 'var(--text-muted)' }}>Net after Payouts/Transfers</span>
            <span style={{ color: 'var(--text-secondary)' }}>Discretionary buffer</span>
          </div>
        </div>

        {/* Metric 5: Cash Flow Forecast (90D Horizon) */}
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
              90D Forecast Ending
            </span>
            <span className="badge-pill med" style={{ fontSize: 10 }}>
              P50 Expected
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
            {fmt_usd(kpis.projectedEndingCash)}
          </div>
          <div className="metric-sub" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5 }}>
            <span style={{ color: 'var(--text-muted)' }}>Quantile Fan Spread</span>
            <span style={{ color: 'var(--yellow)', fontFamily: "'JetBrains Mono', monospace" }}>
              ±{fmt_usd(kpis.confidenceSpread / 2)}
            </span>
          </div>
        </div>
      </div>

      {/* Analytical Secondary Telemetry Bar */}
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
          <span style={{ color: 'var(--text-muted)' }}>12-Week Rolling Net:</span>
          <span
            style={{
              fontWeight: 700,
              color: kpis.historical12wNet >= 0 ? 'var(--green)' : 'var(--red)',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {kpis.historical12wNet >= 0 ? '+' : ''}{fmt_usd(kpis.historical12wNet)}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--text-muted)' }}>Avg Weekly Net:</span>
          <span
            style={{
              fontWeight: 600,
              color: kpis.avgWeeklyNet >= 0 ? 'var(--green)' : 'var(--yellow)',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {fmt_usd(kpis.avgWeeklyNet)}/wk
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--text-muted)' }}>Gross 30D Inflows:</span>
          <span style={{ fontWeight: 600, color: 'var(--accent)', fontFamily: "'JetBrains Mono', monospace" }}>
            +{fmt_usd(kpis.inflows30d)}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--text-muted)' }}>Gross 30D Outflows:</span>
          <span style={{ fontWeight: 600, color: 'var(--red)', fontFamily: "'JetBrains Mono', monospace" }}>
            -{fmt_usd(kpis.outflows30d)}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
          <span style={{ color: 'var(--text-muted)' }}>Worst-Case Runway:</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
            {kpis.p10RunwayDays >= 365 ? '365+ days' : `${kpis.p10RunwayDays} days`}
          </span>
        </div>
      </div>
    </div>
  );
}
