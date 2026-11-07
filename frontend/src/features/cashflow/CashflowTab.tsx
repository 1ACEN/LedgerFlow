import { useState } from 'react';
import { useCashflow } from './useCashflow';
import CashflowKpiStrip from './CashflowKpiStrip';
import { ActualVsForecastChart } from './ActualVsForecastChart';
import { InflowsOutflowsBreakdownCard } from './InflowsOutflowsBreakdownCard';
import { MonthlyQuarterlyTrendsCard } from './MonthlyQuarterlyTrendsCard';
import { ScenarioMatrixCard } from './ScenarioMatrixCard';
import WeeklyFlowChart from './WeeklyFlowChart';
import WeeklyFlowTable from './WeeklyFlowTable';

interface Props {
  refreshKey?: number;
}

type TabFocus = 'all' | 'forecast' | 'breakdown' | 'trends';

export default function CashflowTab({ refreshKey }: Props) {
  const { data, kpis, loading, error, refetch } = useCashflow(refreshKey);
  const [activeFocus, setActiveFocus] = useState<TabFocus>('all');

  if (error) {
    return (
      <div
        className="card animate-in"
        style={{
          padding: 32,
          textAlign: 'center',
          borderColor: 'var(--red)',
          maxWidth: 600,
          margin: '40px auto',
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--red)', marginBottom: 8 }}>
          Failed to load Cash Flow &amp; Predictive Intelligence
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
      className="cashflow-tab-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 22,
        maxWidth: 1560,
        margin: '0 auto',
      }}
    >
      {/* Analytical Data Intelligence Header */}
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
              Analytical Data Intelligence
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>· Cash Flow &amp; Forecast Suite</span>
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
            Cash Flow &amp; Predictive Intelligence
          </h1>
          <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 4, margin: 0 }}>
            Machine learning quantile forecasting, liquidity reserve buffers, scenario sensitivity, and multi-period trend modeling.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Module View Mode Pills */}
          <div className="filter-group">
            <button
              className={`filter-btn ${activeFocus === 'all' ? 'active' : ''}`}
              onClick={() => setActiveFocus('all')}
              style={{ fontSize: 11, padding: '4px 10px' }}
            >
              All Modules
            </button>
            <button
              className={`filter-btn ${activeFocus === 'forecast' ? 'active' : ''}`}
              onClick={() => setActiveFocus('forecast')}
              style={{ fontSize: 11, padding: '4px 10px' }}
            >
              Actual vs Forecast
            </button>
            <button
              className={`filter-btn ${activeFocus === 'breakdown' ? 'active' : ''}`}
              onClick={() => setActiveFocus('breakdown')}
              style={{ fontSize: 11, padding: '4px 10px' }}
            >
              Inflows &amp; Outflows
            </button>
            <button
              className={`filter-btn ${activeFocus === 'trends' ? 'active' : ''}`}
              onClick={() => setActiveFocus('trends')}
              style={{ fontSize: 11, padding: '4px 10px' }}
            >
              Trends &amp; Ledger
            </button>
          </div>

          <div className="demo-badge">
            <span className="demo-dot" />
            <span>Quantile ML Active</span>
          </div>
        </div>
      </div>

      {/* 1. Analytical Intelligence KPI Strip */}
      <CashflowKpiStrip kpis={kpis} loading={loading} />

      {/* 2. Actual vs. Forecast Cash Flow Trajectory */}
      {(activeFocus === 'all' || activeFocus === 'forecast') && (
        <ActualVsForecastChart
          actualHistory={kpis.actualHistory30d}
          forecast={data?.forecast || []}
        />
      )}

      {/* 3. Scenario Sensitivity & Runway Projections */}
      {(activeFocus === 'all' || activeFocus === 'forecast') && (
        <ScenarioMatrixCard scenarios={kpis.scenarios} />
      )}

      {/* 4. Inflows & Outflows Breakdown + Weekly Flow Distribution */}
      {(activeFocus === 'all' || activeFocus === 'breakdown') && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
            gap: 20,
            alignItems: 'stretch',
          }}
        >
          <InflowsOutflowsBreakdownCard
            inflows={kpis.inflowsBreakdown}
            outflows={kpis.outflowsBreakdown}
            totalInflows={kpis.inflows30d}
            totalOutflows={kpis.outflows30d}
          />
          <WeeklyFlowChart weekly={data?.weekly || []} />
        </div>
      )}

      {/* 5. Monthly & Quarterly Trends + 12-Week Rolling Cash Flow Ledger */}
      {(activeFocus === 'all' || activeFocus === 'trends') && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
            gap: 20,
            alignItems: 'stretch',
          }}
        >
          <MonthlyQuarterlyTrendsCard
            monthlyTrends={kpis.monthlyTrends}
            quarterlyTrends={kpis.quarterlyTrends}
          />
          <WeeklyFlowTable weekly={data?.weekly || []} />
        </div>
      )}
    </div>
  );
}
