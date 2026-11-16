import { useState } from 'react';
import { useOps } from './useOps';
import { OpsKpiStrip } from './OpsKpiStrip';
import { AnomalyDetectionCard } from './AnomalyDetectionCard';
import { PaymentGatewayMetricsCard } from './PaymentGatewayMetricsCard';
import { FraudRiskIndicatorsCard } from './FraudRiskIndicatorsCard';
import { AiInsightsCard } from './AiInsightsCard';
import { DeclinesChart } from './DeclinesChart';
import { SuccessTrendChart } from './SuccessTrendChart';
import { RetryAdvisorTable } from './RetryAdvisorTable';
import { DisputesTable } from './DisputesTable';
import { CrossFilterProvider } from '../../lib/CrossFilterContext';
import ActiveFiltersBar from '../../components/ActiveFiltersBar';

interface OpsTabProps {
  refreshKey?: number;
}

type TabFocus = 'all' | 'anomalies' | 'gateways' | 'retries' | 'disputes';

const OpsTabContent = ({ refreshKey }: OpsTabProps) => {
  const { data, kpis, loading, error, refetch } = useOps(refreshKey);
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
          Failed to load AI Operations Console
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

  const declines = data?.declines || [];
  const successTrend = data?.success_trend || [];
  const retryAdvisor = data?.retry_advisor || [];
  const disputes = data?.disputes || [];

  return (
    <div
      className="ops-tab-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        maxWidth: 1560,
        margin: '0 auto',
        width: '100%',
      }}
    >
      {/* Modern AI Operations Console Header */}
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
              Modern AI Operations Console
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>· Neural Infrastructure Suite</span>
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
            Fintech Operations &amp; Autonomous AI Console
          </h1>
          <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 4, margin: 0 }}>
            Continuous transaction monitoring, neural anomaly detection, gateway routing telemetry, and predictive decline recovery.
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
              All Systems
            </button>
            <button
              className={`filter-btn ${activeFocus === 'anomalies' ? 'active' : ''}`}
              onClick={() => setActiveFocus('anomalies')}
              style={{ fontSize: 11, padding: '4px 10px' }}
            >
              Anomalies &amp; AI
            </button>
            <button
              className={`filter-btn ${activeFocus === 'gateways' ? 'active' : ''}`}
              onClick={() => setActiveFocus('gateways')}
              style={{ fontSize: 11, padding: '4px 10px' }}
            >
              Gateways &amp; Risk
            </button>
            <button
              className={`filter-btn ${activeFocus === 'retries' ? 'active' : ''}`}
              onClick={() => setActiveFocus('retries')}
              style={{ fontSize: 11, padding: '4px 10px' }}
            >
              Decline Retries
            </button>
            <button
              className={`filter-btn ${activeFocus === 'disputes' ? 'active' : ''}`}
              onClick={() => setActiveFocus('disputes')}
              style={{ fontSize: 11, padding: '4px 10px' }}
            >
              Disputes Queue
            </button>
          </div>

          <div className="demo-badge">
            <span className="demo-dot" />
            <span>Neural Core Active</span>
          </div>
        </div>
      </div>

      {/* Power BI Interactive Active Filters Bar */}
      <ActiveFiltersBar />

      {/* 1. Modern AI Operations KPI Strip */}
      <OpsKpiStrip kpis={kpis} loading={loading} />

      {/* 2. AI Anomaly Detection & Strategic Autonomous Recommendations */}
      {(activeFocus === 'all' || activeFocus === 'anomalies') && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 460px), 1fr))',
            gap: 20,
            alignItems: 'stretch',
          }}
        >
          <AnomalyDetectionCard
            anomalies={kpis.anomaliesFlagged}
            healthScore={kpis.systemHealthScore}
            status={kpis.anomalyStatus}
          />
          <AiInsightsCard insights={kpis.aiInsights} />
        </div>
      )}

      {/* 3. Payment Gateway Metrics & Fraud/Risk Indicators */}
      {(activeFocus === 'all' || activeFocus === 'gateways') && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 460px), 1fr))',
            gap: 20,
            alignItems: 'stretch',
          }}
        >
          <PaymentGatewayMetricsCard
            gateways={kpis.gateways}
            avgLatencyMs={data?.payment_processing_metrics?.avg_gateway_latency_ms || 114}
          />
          <FraudRiskIndicatorsCard
            fraud={data?.fraud_risk_indicators || {
              normal_count: kpis.totalTransactions,
              elevated_risk_count: 0,
              highest_risk_count: 0,
              dispute_rate_bps: kpis.disputeRateBps,
              chargeback_threshold_status: 'Optimal',
              disputes_won_count: 0,
              disputes_lost_count: 0,
              active_disputes_count: kpis.activeDisputesCount,
              win_rate_pct: kpis.disputeWinRatePct,
              total_dispute_amount_usd: kpis.totalDisputeAmount,
            }}
          />
        </div>
      )}

      {/* 4. Payment Rail Declines Chart & 60-Day Success Rate Trend */}
      {(activeFocus === 'all' || activeFocus === 'retries') && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 460px), 1fr))',
            gap: 20,
            alignItems: 'stretch',
          }}
        >
          <DeclinesChart declines={declines} />
          <SuccessTrendChart trend={successTrend} />
        </div>
      )}

      {/* 5. AI Decline Retry Advisor Table */}
      {(activeFocus === 'all' || activeFocus === 'retries') && (
        <RetryAdvisorTable rows={retryAdvisor} />
      )}

      {/* 6. Disputes & Chargeback Queue */}
      {(activeFocus === 'all' || activeFocus === 'disputes') && (
        <DisputesTable disputes={disputes} />
      )}
    </div>
  );
};

export const OpsTab = (props: OpsTabProps) => {
  return (
    <CrossFilterProvider>
      <OpsTabContent {...props} />
    </CrossFilterProvider>
  );
};
