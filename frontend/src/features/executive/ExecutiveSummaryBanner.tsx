import React from 'react';
import type { ExecutiveKpis } from './useExecutive';

interface ExecutiveSummaryBannerProps {
  kpis: ExecutiveKpis;
}

function fmtUsdCompact(v: number): string {
  if (Math.abs(v) >= 1_000_000) {
    return `$${(v / 1_000_000).toFixed(2)}M`;
  }
  if (Math.abs(v) >= 1_000) {
    return `$${(v / 1_000).toFixed(1)}k`;
  }
  return `$${v.toFixed(0)}`;
}

export const ExecutiveSummaryBanner: React.FC<ExecutiveSummaryBannerProps> = ({ kpis }) => {
  const isProfitable = kpis.netProfit30d >= 0;
  const isRunwaySolid = kpis.runwayDays >= 180;

  return (
    <div className="card executive-banner animate-in stagger-1">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>
              Executive Command Center — Financial Briefing
            </span>
            <span className={`badge-pill ${isProfitable && isRunwaySolid ? 'high' : 'med'}`}>
              {isProfitable && isRunwaySolid ? 'Capital Healthy & Profitable' : 'Stable Operating Watch'}
            </span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
            High-level synthesized telemetry across liquidity, unit economics, runway horizons, and operating risks.
          </p>
        </div>
      </div>

      {/* 3 Pillar Summary Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 16,
          paddingTop: 14,
          borderTop: '1px solid var(--border)',
        }}
      >
        {/* Pillar 1: Liquidity & Solvency */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            Liquidity &amp; Runway
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
            {fmtUsdCompact(kpis.currentCash)} Reserves · {kpis.runwayDays}d Runway
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.45 }}>
            {kpis.runwayDays >= 180
              ? `Operational cash runway remains well beyond the 6-month threshold (~${Math.floor(kpis.runwayDays / 30)} months forward buffer).`
              : 'Runway is under active observation; monitor monthly capital burn velocity.'}
          </div>
        </div>

        {/* Pillar 2: Unit Economics & Margin */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            Unit Economics &amp; Margin
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
            {kpis.grossMarginPct}% Gross · {kpis.netMarginPct}% Net Margin
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.45 }}>
            Generated {fmtUsdCompact(kpis.totalRevenue30d)} revenue over the past 30 days with {fmtUsdCompact(kpis.netProfit30d)} in net operating surplus.
          </div>
        </div>

        {/* Pillar 3: Risk & Working Capital */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            Working Capital &amp; Risk
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
            {kpis.arRisk.overdue_90plus_pct}% Overdue 90+ · {kpis.gatewaySuccessRate}% Auth
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.45 }}>
            {kpis.arRisk.overdue_90plus_pct <= 20
              ? 'Receivables concentration in overdue buckets remains safely controlled.'
              : 'Overdue receivables require accelerated collections focus to safeguard operating liquidity.'}
          </div>
        </div>
      </div>
    </div>
  );
};

