import { useState } from 'react';
import { useArAging } from './useArAging';
import ArKpiStrip from './ArKpiStrip';
import AgingBucketAnalysisCard from './AgingBucketAnalysisCard';
import CollectionEfficiencyCard from './CollectionEfficiencyCard';
import HighRiskAccountsCard from './HighRiskAccountsCard';
import ArBucketChart from './ArBucketChart';
import ArAgingTable from './ArAgingTable';

interface Props {
  refreshKey?: number;
}

type TabFocus = 'all' | 'buckets' | 'efficiency' | 'high_risk' | 'ledger';

export default function ArAgingTab({ refreshKey }: Props) {
  const { data, kpis, buckets, efficiency, highRisk, aging, loading, error, refetch } = useArAging(refreshKey);
  const [activeFocus, setActiveFocus] = useState<TabFocus>('all');

  if (error) {
    return (
      <div className="card animate-in" style={{ padding: 32, textAlign: 'center', borderColor: 'var(--red)', maxWidth: 600, margin: '40px auto' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--red)', marginBottom: 8 }}>
          Failed to load Accounts Receivable &amp; Risk Intelligence
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

  if (loading && !data) {
    return (
      <div className="card animate-in" style={{ padding: 24 }}>
        <div className="skeleton" style={{ height: 28, width: 280, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 100, marginBottom: 20 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
          <div className="skeleton" style={{ height: 120 }} />
          <div className="skeleton" style={{ height: 120 }} />
          <div className="skeleton" style={{ height: 120 }} />
          <div className="skeleton" style={{ height: 120 }} />
        </div>
        <div className="skeleton" style={{ height: 320 }} />
      </div>
    );
  }

  return (
    <div
      className="ar-aging-tab-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        maxWidth: 1560,
        margin: '0 auto',
      }}
    >
      {/* Header with Navigation Pills & Refresh Control */}
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
                color: '#f59e0b',
                padding: '2px 8px',
                background: 'rgba(245, 158, 11, 0.12)',
                borderRadius: 'var(--radius-xs)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
              }}
            >
              Collections &amp; Risk Management Dashboard
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              · Accrual Basis Ledger · Delinquency Surveillance
            </span>
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
            Accounts Receivable &amp; Credit Risk
          </h1>
          <p
            style={{
              fontSize: 12.5,
              color: 'var(--text-secondary)',
              margin: '3px 0 0 0',
            }}
          >
            Aging bucket stratification, DSO turnover velocity, bad debt provisioning, and high-risk dunning queue
          </p>
        </div>

        {/* View Focus Pills & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div className="filter-group">
            <button
              className={`filter-btn ${activeFocus === 'all' ? 'active' : ''}`}
              onClick={() => setActiveFocus('all')}
              style={{ fontSize: 11, padding: '4px 10px' }}
            >
              All Operations
            </button>
            <button
              className={`filter-btn ${activeFocus === 'buckets' ? 'active' : ''}`}
              onClick={() => setActiveFocus('buckets')}
              style={{ fontSize: 11, padding: '4px 10px' }}
            >
              Aging Buckets
            </button>
            <button
              className={`filter-btn ${activeFocus === 'efficiency' ? 'active' : ''}`}
              onClick={() => setActiveFocus('efficiency')}
              style={{ fontSize: 11, padding: '4px 10px' }}
            >
              Turnover &amp; DSO
            </button>
            <button
              className={`filter-btn ${activeFocus === 'high_risk' ? 'active' : ''}`}
              onClick={() => setActiveFocus('high_risk')}
              style={{ fontSize: 11, padding: '4px 10px' }}
            >
              High Risk ({highRisk.length})
            </button>
            <button
              className={`filter-btn ${activeFocus === 'ledger' ? 'active' : ''}`}
              onClick={() => setActiveFocus('ledger')}
              style={{ fontSize: 11, padding: '4px 10px' }}
            >
              Customer Ledger
            </button>
          </div>
        </div>
      </div>

      {/* 5-Card Command Strip */}
      {kpis && <ArKpiStrip summary={kpis} efficiency={efficiency} aging={aging} />}

      {/* View Section 1: Aging Buckets & Risk Stratification */}
      {(activeFocus === 'all' || activeFocus === 'buckets') && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1.2fr)', gap: 16 }}>
          <AgingBucketAnalysisCard buckets={buckets} totalOutstanding={kpis?.total_outstanding_usd || 0} />
          <ArBucketChart aging={aging} />
        </div>
      )}

      {/* View Section 2: Collection Efficiency & High-Risk Queue */}
      {(activeFocus === 'all' || activeFocus === 'efficiency' || activeFocus === 'high_risk') && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16 }}>
          {(activeFocus === 'all' || activeFocus === 'efficiency') && (
            <CollectionEfficiencyCard efficiency={efficiency} />
          )}
          {(activeFocus === 'all' || activeFocus === 'high_risk') && (
            <HighRiskAccountsCard accounts={highRisk} />
          )}
        </div>
      )}

      {/* View Section 3: Customer-Wise Outstanding Ledger */}
      {(activeFocus === 'all' || activeFocus === 'ledger') && (
        <div className="card animate-in" style={{ padding: 0 }}>
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                  Customer-Wise Outstanding Ledger
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: 'var(--pill-bg)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {aging.length} Accounts Loaded
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>
                Detailed account balances, aging breakdown, credit utilization, and action execution triggers
              </p>
            </div>
          </div>
          <ArAgingTable aging={aging} />
        </div>
      )}
    </div>
  );
}
