import { useState } from 'react';
import { useRevenue } from './useRevenue';
import RevenueKpiStrip from './RevenueKpiStrip';
import { FinancialPerformanceTrendsChart } from './FinancialPerformanceTrendsChart';
import { BudgetVsActualCard } from './BudgetVsActualCard';
import { CustomerSegmentationCard } from './CustomerSegmentationCard';
import { DepartmentExpenseCard } from './DepartmentExpenseCard';
import { DebtCapitalStructureCard } from './DebtCapitalStructureCard';
import RevenueProductBars from './RevenueProductBars';
import RevenueMixChart from './RevenueMixChart';
import IncomeStatementTable from './IncomeStatementTable';

interface Props {
  refreshKey?: number;
}

type TabFocus = 'all' | 'performance' | 'segmentation' | 'budget' | 'products';

export default function RevenueTab({ refreshKey }: Props) {
  const { data, kpis, loading, error, refetch } = useRevenue(refreshKey);
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
          Failed to load CFO &amp; Revenue Suite
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

  const rows = data?.revenue_by_product || [];

  return (
    <div
      className="revenue-tab-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 22,
        maxWidth: 1560,
        margin: '0 auto',
      }}
    >
      {/* Strategic Financial Intelligence Header */}
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
              Strategic Financial Intelligence
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>· CFO Executive Suite</span>
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
            CFO &amp; Revenue Analytics
          </h1>
          <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 4, margin: 0 }}>
            GAAP accrual performance, departmental OpEx cost optimization, customer portfolio segmentation, and budget vs actual variance.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Module View Mode Pills */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: 'rgba(255, 255, 255, 0.04)',
              padding: 3,
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
            }}
          >
            <button
              className={`filter-btn ${activeFocus === 'all' ? 'active' : ''}`}
              onClick={() => setActiveFocus('all')}
              style={{ fontSize: 11, padding: '4px 10px' }}
            >
              All Modules
            </button>
            <button
              className={`filter-btn ${activeFocus === 'performance' ? 'active' : ''}`}
              onClick={() => setActiveFocus('performance')}
              style={{ fontSize: 11, padding: '4px 10px' }}
            >
              Trends &amp; Budget
            </button>
            <button
              className={`filter-btn ${activeFocus === 'segmentation' ? 'active' : ''}`}
              onClick={() => setActiveFocus('segmentation')}
              style={{ fontSize: 11, padding: '4px 10px' }}
            >
              Segmentation &amp; OpEx
            </button>
            <button
              className={`filter-btn ${activeFocus === 'products' ? 'active' : ''}`}
              onClick={() => setActiveFocus('products')}
              style={{ fontSize: 11, padding: '4px 10px' }}
            >
              Products &amp; P&amp;L
            </button>
          </div>

          <div className="demo-badge">
            <span className="demo-dot" />
            <span>Accrual P&amp;L Active</span>
          </div>

          <button
            className="refresh-btn"
            onClick={refetch}
            disabled={loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              padding: '6px 14px',
            }}
          >
            <span style={{ display: 'inline-block', transform: loading ? 'rotate(180deg)' : 'none', transition: 'transform 0.5s' }}>
              ↻
            </span>
            <span>{loading ? 'Auditing...' : 'Sync Ledger'}</span>
          </button>
        </div>
      </div>

      {/* 1. Strategic Financial Intelligence KPI Strip */}
      <RevenueKpiStrip kpis={kpis} loading={loading} />

      {/* 2. Financial Performance Trends & Budget vs Actual Performance */}
      {(activeFocus === 'all' || activeFocus === 'performance') && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
            gap: 20,
            alignItems: 'stretch',
          }}
        >
          <FinancialPerformanceTrendsChart trends={kpis.performanceTrends} />
          <BudgetVsActualCard items={kpis.budgetVsActual} />
        </div>
      )}

      {/* 3. Customer Portfolio Segmentation & Departmental OpEx Breakdown */}
      {(activeFocus === 'all' || activeFocus === 'segmentation') && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
            gap: 20,
            alignItems: 'stretch',
          }}
        >
          <CustomerSegmentationCard
            tiers={kpis.customerTiers}
            topCustomers={kpis.topCustomers}
          />
          <DepartmentExpenseCard
            expenses={kpis.expensesByDept}
            totalOpex={kpis.operatingExpenses}
          />
        </div>
      )}

      {/* 4. Debt Management & Forward Strategic Guidance */}
      {(activeFocus === 'all' || activeFocus === 'performance') && (
        <DebtCapitalStructureCard
          debt={kpis.debtStructure}
          forecasting={kpis.forecasting}
        />
      )}

      {/* 5. Product Line Performance & Multi-Month Income Statement Ledger */}
      {(activeFocus === 'all' || activeFocus === 'products') && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
            gap: 20,
            alignItems: 'stretch',
          }}
        >
          <RevenueProductBars rows={rows} />
          <RevenueMixChart rows={rows} />
        </div>
      )}

      {(activeFocus === 'all' || activeFocus === 'products') && rows.length > 0 && (
        <IncomeStatementTable rows={rows} />
      )}
    </div>
  );
}
