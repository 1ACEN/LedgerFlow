import React, { useState, useMemo } from 'react';
import { useExecutive } from './useExecutive';
import { ExecutiveSummaryBanner } from './ExecutiveSummaryBanner';
import { ExecutiveKpiStrip } from './ExecutiveKpiStrip';
import { RevenueVsExpensesChart } from './RevenueVsExpensesChart';
import { FinancialHealthRiskCard } from './FinancialHealthRiskCard';
import { ExecutiveAlertsCard } from './ExecutiveAlertsCard';
import { CashTrajectoryChart } from './CashTrajectoryChart';
import { DailyFlowsChart } from './DailyFlowsChart';
import { ExecutiveFlowsTable } from './ExecutiveFlowsTable';
import { CrossFilterProvider, useCrossFilter } from '../../lib/CrossFilterContext';
import ActiveFiltersBar from '../../components/ActiveFiltersBar';

interface ExecutiveTabProps {
  refreshKey?: number;
}

type DeepDiveView = 'all' | 'trajectory' | 'daily' | 'ledger';

const ExecutiveTabContent: React.FC<ExecutiveTabProps> = ({ refreshKey }) => {
  const { data, kpis, loading, error, refetch } = useExecutive(refreshKey);
  const { filters } = useCrossFilter();
  const [deepDiveView, setDeepDiveView] = useState<DeepDiveView>('all');

  const trend = data?.cash_trend || [];

  // Dynamic KPI slice based on active cross-filter (Month or Date)
  const activeKpis = useMemo(() => {
    if (!kpis) return kpis;
    let dynamic = { ...kpis };

    if (filters.month) {
      const point = kpis.monthlyComparison.find((p) => p.month === filters.month);
      if (point) {
        dynamic = {
          ...dynamic,
          totalRevenue30d: point.revenue,
          totalExpenses30d: point.expenses,
          netProfit30d: point.net_profit,
          netMarginPct: point.margin_pct,
        };
      }
    } else if (filters.date) {
      const dayPoint = trend.find((p) => p.date === filters.date);
      if (dayPoint) {
        dynamic = {
          ...dynamic,
          totalRevenue30d: dayPoint.inflows,
          totalExpenses30d: dayPoint.outflows,
          netProfit30d: dayPoint.net,
          currentCash: dayPoint.cash,
          netMarginPct:
            dayPoint.inflows > 0
              ? Number(((dayPoint.net / dayPoint.inflows) * 100).toFixed(1))
              : 0,
        };
      }
    }

    return dynamic;
  }, [kpis, filters.month, filters.date, trend]);

  if (error) {
    return (
      <div
        className="card"
        style={{
          padding: 32,
          textAlign: 'center',
          borderColor: 'var(--red)',
          maxWidth: 600,
          margin: '40px auto',
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--red)', marginBottom: 8 }}>
          Failed to load Executive Command Center
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
          {error}
        </div>
        <button
          className="refresh-btn"
          onClick={refetch}
          style={{ display: 'inline-flex', margin: '0 auto', gap: 8, alignItems: 'center' }}
        >
          <span>↻</span>
          <span>Retry Connection</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className="executive-command-center"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        maxWidth: 1560,
        margin: '0 auto',
        width: '100%',
      }}
    >
      {/* Executive Command Center Header Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 16,
          paddingBottom: 4,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                color: 'var(--accent)',
                padding: '2px 8px',
                background: 'var(--accent-soft)',
                borderRadius: 'var(--radius-xs)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
              }}
            >
              Executive Command Center
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>· C-Suite Strategic Suite</span>
          </div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: 'var(--text-primary)',
              letterSpacing: '-0.4px',
              margin: 0,
            }}
          >
            Executive Financial Overview
          </h1>
          <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 4, margin: 0 }}>
            Unified real-time telemetry across revenue realization, expense burn, net profitability, and treasury solvency.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div className="demo-badge">
            <span className="demo-dot" />
            <span>Live Telemetry</span>
          </div>
        </div>
      </div>

      {/* Power BI Interactive Active Filters Bar */}
      <ActiveFiltersBar />

      {/* 1. Concise Executive Summary Briefing */}
      <ExecutiveSummaryBanner kpis={activeKpis} />

      {/* 2. Four Large Hero Command Center KPI Cards */}
      <ExecutiveKpiStrip kpis={activeKpis} loading={loading} />

      {/* 3. Command Center Core Visualizations & Health Grid */}
      {loading ? (
        <div className="grid-2">
          {[1, 2].map((i) => (
            <div key={i} className="card skeleton-card" style={{ height: 380 }}>
              <div className="skeleton skeleton-text" style={{ width: '40%', marginBottom: 16 }} />
              <div className="skeleton skeleton-block" style={{ height: 300 }} />
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 460px), 1fr))',
            gap: 20,
            alignItems: 'stretch',
          }}
        >
          {/* Left Column: Revenue vs Expenses Multi-Period Trajectory */}
          <div style={{ minWidth: 0 }}>
            <RevenueVsExpensesChart data={kpis.monthlyComparison} />
          </div>

          {/* Right Column: Stacked Financial Health & Decision Alerts */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
            <FinancialHealthRiskCard kpis={activeKpis} />
            <ExecutiveAlertsCard alerts={kpis.alerts} />
          </div>
        </div>
      )}

      {/* 4. Deep-Dive Treasury & Cash Movement Exploratory Section */}
      <div className="card animate-in stagger-3" style={{ marginTop: 6 }}>
        <div
          className="card-header"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
            padding: '16px 20px',
          }}
        >
          <div>
            <span className="card-title" style={{ fontSize: 14 }}>
              Treasury Cash Flow &amp; Reserve Trajectory
            </span>
            <span className="card-subtitle" style={{ display: 'block' }}>
              Multi-day forward balance simulation, daily net flow deltas, and audited ledger activity
            </span>
          </div>

          {/* Segmented View Switcher */}
          <div className="filter-group">
            <button
              className={`filter-btn ${deepDiveView === 'all' ? 'active' : ''}`}
              onClick={() => setDeepDiveView('all')}
              style={{ fontSize: 11, padding: '4px 10px' }}
            >
              All Views
            </button>
            <button
              className={`filter-btn ${deepDiveView === 'trajectory' ? 'active' : ''}`}
              onClick={() => setDeepDiveView('trajectory')}
              style={{ fontSize: 11, padding: '4px 10px' }}
            >
              Cash Trajectory
            </button>
            <button
              className={`filter-btn ${deepDiveView === 'daily' ? 'active' : ''}`}
              onClick={() => setDeepDiveView('daily')}
              style={{ fontSize: 11, padding: '4px 10px' }}
            >
              Daily In/Outflows
            </button>
            <button
              className={`filter-btn ${deepDiveView === 'ledger' ? 'active' : ''}`}
              onClick={() => setDeepDiveView('ledger')}
              style={{ fontSize: 11, padding: '4px 10px' }}
            >
              Liquidity Ledger
            </button>
          </div>
        </div>

        <div className="card-body" style={{ padding: '20px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Trajectory & Daily Flows Charts */}
          {(deepDiveView === 'all' || deepDiveView === 'trajectory' || deepDiveView === 'daily') && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  deepDiveView === 'all' ? 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))' : '1fr',
                gap: 18,
              }}
            >
              {(deepDiveView === 'all' || deepDiveView === 'trajectory') && (
                <CashTrajectoryChart trend={trend} />
              )}
              {(deepDiveView === 'all' || deepDiveView === 'daily') && (
                <DailyFlowsChart trend={trend} />
              )}
            </div>
          )}

          {/* 30-Day Liquidity Ledger Table */}
          {(deepDiveView === 'all' || deepDiveView === 'ledger') && trend.length > 0 && (
            <div style={{ marginTop: deepDiveView === 'all' ? 4 : 0 }}>
              <ExecutiveFlowsTable trend={trend} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const ExecutiveTab: React.FC<ExecutiveTabProps> = (props) => {
  return (
    <CrossFilterProvider>
      <ExecutiveTabContent {...props} />
    </CrossFilterProvider>
  );
};
