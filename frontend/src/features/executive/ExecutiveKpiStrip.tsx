import React from 'react';
import type { ExecutiveKpis } from './useExecutive';

interface ExecutiveKpiStripProps {
  kpis: ExecutiveKpis;
  loading?: boolean;
}

function fmtUsd(v: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(v);
}

function fmtUsdExact(v: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(v);
}

export const ExecutiveKpiStrip: React.FC<ExecutiveKpiStripProps> = ({ kpis, loading }) => {
  if (loading) {
    return (
      <div className="grid-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="metric-card skeleton-card" style={{ padding: '22px 24px' }}>
            <div className="skeleton skeleton-text" style={{ width: '45%', marginBottom: 12 }} />
            <div className="skeleton skeleton-text" style={{ width: '75%', height: 38, marginBottom: 10 }} />
            <div className="skeleton skeleton-text" style={{ width: '55%' }} />
          </div>
        ))}
      </div>
    );
  }

  const isNetPositive = kpis.netProfit30d >= 0;
  const isCashFlowPositive = kpis.net30dChange >= 0;
  const expenseRatio = kpis.totalRevenue30d > 0
    ? Math.round((kpis.totalExpenses30d / kpis.totalRevenue30d) * 100)
    : 0;

  return (
    <div className="executive-kpi-container" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* 4 Large Hero Command Center KPI Cards */}
      <div className="grid-4" style={{ marginBottom: 0 }}>
        {/* Hero Card 1: Total Revenue */}
        <div
          className="metric-card animate-in stagger-1"
          style={{
            padding: '22px 24px',
            background: 'linear-gradient(180deg, rgba(22, 34, 56, 0.75) 0%, rgba(14, 20, 35, 0.9) 100%)',
            border: '1px solid rgba(59, 130, 246, 0.22)',
            boxShadow: 'inset 0 1px 0 0 rgba(59, 130, 246, 0.15), var(--shadow-card)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="metric-label" style={{ color: 'var(--text-secondary)' }}>
              Total Revenue (30D)
            </span>
            <span
              className="badge-pill high"
              style={{ fontSize: 10, padding: '2px 8px', letterSpacing: '0.3px' }}
            >
              {kpis.grossMarginPct}% GM
            </span>
          </div>
          <div
            className="metric-value"
            style={{
              fontSize: 32,
              fontWeight: 800,
              color: '#60a5fa',
              letterSpacing: '-0.8px',
              margin: '4px 0',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {fmtUsd(kpis.totalRevenue30d)}
          </div>
          <div className="metric-sub" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: 'var(--text-muted)' }}>Gross Invoiced &amp; Realized</span>
            <span style={{ color: kpis.revenueGrowthMoM >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
              {kpis.revenueGrowthMoM >= 0 ? '+' : ''}{kpis.revenueGrowthMoM}% MoM
            </span>
          </div>
        </div>

        {/* Hero Card 2: Total Expenses */}
        <div
          className="metric-card animate-in stagger-2"
          style={{
            padding: '22px 24px',
            background: 'linear-gradient(180deg, rgba(38, 22, 32, 0.75) 0%, rgba(20, 14, 22, 0.9) 100%)',
            border: '1px solid rgba(244, 63, 94, 0.22)',
            boxShadow: 'inset 0 1px 0 0 rgba(244, 63, 94, 0.15), var(--shadow-card)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="metric-label" style={{ color: 'var(--text-secondary)' }}>
              Total Expenses (30D)
            </span>
            <span
              className="badge-pill med"
              style={{ fontSize: 10, padding: '2px 8px', letterSpacing: '0.3px' }}
            >
              {expenseRatio}% of Rev
            </span>
          </div>
          <div
            className="metric-value"
            style={{
              fontSize: 32,
              fontWeight: 800,
              color: '#fb7185',
              letterSpacing: '-0.8px',
              margin: '4px 0',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {fmtUsd(kpis.totalExpenses30d)}
          </div>
          <div className="metric-sub" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: 'var(--text-muted)' }}>Operating Outflows &amp; Fees</span>
            <span style={{ color: 'var(--text-secondary)' }}>
              ~{fmtUsd(kpis.dailyOutflow)}/day
            </span>
          </div>
        </div>

        {/* Hero Card 3: Net Profit */}
        <div
          className="metric-card animate-in stagger-3"
          style={{
            padding: '22px 24px',
            background: 'linear-gradient(180deg, rgba(18, 38, 32, 0.75) 0%, rgba(13, 24, 20, 0.9) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.24)',
            boxShadow: 'inset 0 1px 0 0 rgba(16, 185, 129, 0.15), var(--shadow-card)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="metric-label" style={{ color: 'var(--text-secondary)' }}>
              Net Profit (30D)
            </span>
            <span
              className={`badge-pill ${isNetPositive ? 'high' : 'low'}`}
              style={{ fontSize: 10, padding: '2px 8px', letterSpacing: '0.3px' }}
            >
              {kpis.netMarginPct}% Margin
            </span>
          </div>
          <div
            className="metric-value"
            style={{
              fontSize: 32,
              fontWeight: 800,
              color: isNetPositive ? '#34d399' : '#f87171',
              letterSpacing: '-0.8px',
              margin: '4px 0',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {fmtUsd(kpis.netProfit30d)}
          </div>
          <div className="metric-sub" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: 'var(--text-muted)' }}>Operating Bottom Line</span>
            <span style={{ color: isNetPositive ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
              {isNetPositive ? 'Profitable' : 'Deficit'}
            </span>
          </div>
        </div>

        {/* Hero Card 4: Cash Balance */}
        <div
          className="metric-card animate-in stagger-4"
          style={{
            padding: '22px 24px',
            background: 'linear-gradient(180deg, rgba(25, 30, 48, 0.75) 0%, rgba(14, 18, 30, 0.9) 100%)',
            border: '1px solid rgba(99, 102, 241, 0.22)',
            boxShadow: 'inset 0 1px 0 0 rgba(99, 102, 241, 0.15), var(--shadow-card)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="metric-label" style={{ color: 'var(--text-secondary)' }}>
              Cash Balance
            </span>
            <span
              className={`badge-pill ${
                kpis.runwayStatus === 'healthy' ? 'high' : kpis.runwayStatus === 'moderate' ? 'med' : 'low'
              }`}
              style={{ fontSize: 10, padding: '2px 8px', letterSpacing: '0.3px' }}
            >
              {kpis.runwayDays}d Runway
            </span>
          </div>
          <div
            className="metric-value"
            style={{
              fontSize: 32,
              fontWeight: 800,
              color: '#a5b4fc',
              letterSpacing: '-0.8px',
              margin: '4px 0',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {fmtUsd(kpis.currentCash)}
          </div>
          <div className="metric-sub" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: 'var(--text-muted)' }}>Treasury &amp; Operating</span>
            <span style={{ color: isCashFlowPositive ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
              {isCashFlowPositive ? '+' : ''}{fmtUsd(kpis.net30dChange)} (30d)
            </span>
          </div>
        </div>
      </div>

      {/* Secondary Strategic Telemetry Bar */}
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
          <span style={{ color: 'var(--text-muted)' }}>Net Cash Flow (30D):</span>
          <span
            style={{
              fontWeight: 700,
              color: isCashFlowPositive ? 'var(--green)' : 'var(--red)',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {isCashFlowPositive ? '+' : ''}{fmtUsdExact(kpis.net30dChange)}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--text-muted)' }}>Gross Inflows:</span>
          <span style={{ fontWeight: 600, color: 'var(--accent)', fontFamily: "'JetBrains Mono', monospace" }}>
            {fmtUsd(kpis.totalInflows30d)}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--text-muted)' }}>Gross Outflows:</span>
          <span style={{ fontWeight: 600, color: 'var(--red)', fontFamily: "'JetBrains Mono', monospace" }}>
            {fmtUsd(kpis.totalOutflows30d)}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--text-muted)' }}>Ledger Records:</span>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>
            {kpis.totalTransactions.toLocaleString()}
          </span>
        </div>

        {kpis.lastIngested && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
            <span style={{ color: 'var(--text-muted)' }}>Last Event:</span>
            <span style={{ color: 'var(--green)', fontFamily: "'JetBrains Mono', monospace" }}>
              {new Date(kpis.lastIngested).toLocaleDateString()} {new Date(kpis.lastIngested).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
