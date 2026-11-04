import { fmt_usd } from '../../lib/api';
import type { PaymentGatewayStats } from './useOps';

interface PaymentGatewayMetricsCardProps {
  gateways: PaymentGatewayStats[];
  avgLatencyMs: number;
}

export const PaymentGatewayMetricsCard = ({
  gateways,
  avgLatencyMs,
}: PaymentGatewayMetricsCardProps) => {
  return (
    <div className="card animate-in stagger-3" style={{ height: '100%' }}>
      <div
        className="card-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <span className="card-title">Payment Gateway Processing Telemetry</span>
          <span className="card-subtitle" style={{ display: 'block' }}>
            Authorization success rates, settlement latency, and routing distribution across rails
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-secondary)' }}>
          <span>Avg Latency:</span>
          <span style={{ fontWeight: 700, color: 'var(--accent)', fontFamily: "'JetBrains Mono', monospace" }}>
            {avgLatencyMs}ms (p95)
          </span>
        </div>
      </div>

      <div className="card-body" style={{ padding: 0 }}>
        <div className="table-container" style={{ maxHeight: 380 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ minWidth: 150 }}>Payment Channel</th>
                <th style={{ textAlign: 'right' }}>Auth Rate</th>
                <th style={{ textAlign: 'right' }}>Processed Volume</th>
                <th style={{ textAlign: 'right' }}>Transactions</th>
                <th style={{ textAlign: 'right' }}>Latency (p95)</th>
                <th style={{ textAlign: 'center', width: 100 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {gateways.length === 0 ? (
                <tr>
                  <td colSpan={6} className="empty-state">
                    <div className="empty-state-title">No gateway telemetry available</div>
                  </td>
                </tr>
              ) : (
                gateways.map((gw) => {
                  const isOptimal = gw.success_rate >= 93.0;
                  return (
                    <tr key={gw.source}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {gw.name}
                      </td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        <span style={{ fontWeight: 700, color: isOptimal ? 'var(--green)' : 'var(--yellow)' }}>
                          {gw.success_rate}%
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                        {fmt_usd(gw.volume_usd)}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                        {gw.total_transactions.toLocaleString()}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--accent)', fontFamily: "'JetBrains Mono', monospace" }}>
                        {gw.avg_latency_ms}ms
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span
                          className={`badge-pill ${isOptimal ? 'high' : 'med'}`}
                          style={{ fontSize: 10 }}
                        >
                          {gw.health_status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

