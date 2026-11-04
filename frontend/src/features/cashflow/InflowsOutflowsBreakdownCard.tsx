import { fmt_usd } from '../../lib/api';
import type { FlowBreakdownItem } from './useCashflow';

interface InflowsOutflowsBreakdownCardProps {
  inflows: FlowBreakdownItem[];
  outflows: FlowBreakdownItem[];
  totalInflows: number;
  totalOutflows: number;
}

export const InflowsOutflowsBreakdownCard = ({
  inflows,
  outflows,
  totalInflows,
  totalOutflows,
}: InflowsOutflowsBreakdownCardProps) => {
  return (
    <div className="card animate-in stagger-3" style={{ height: '100%' }}>
      <div className="card-header">
        <div>
          <span className="card-title">Cash Inflow &amp; Outflow Sources Breakdown</span>
          <span className="card-subtitle" style={{ display: 'block' }}>
            Audited attribution of capital generation sources vs. operational and settlement uses (Trailing 30D)
          </span>
        </div>
      </div>

      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 24,
          }}
        >
          {/* Column 1: Cash Inflows Sources */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              padding: 16,
              background: 'rgba(16, 185, 129, 0.025)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(16, 185, 129, 0.15)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px solid rgba(16, 185, 129, 0.15)', paddingBottom: 10 }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Sources of Inflow
                </span>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
                  +{fmt_usd(totalInflows)}
                </div>
              </div>
              <span className="badge-pill high" style={{ fontSize: 10 }}>
                Revenue Channels
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
              {inflows.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  No categorized inflow data available.
                </div>
              ) : (
                inflows.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                        {item.category}
                      </span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>
                        {fmt_usd(item.amount)}
                        <span style={{ color: 'var(--text-muted)', fontSize: 11, marginLeft: 6 }}>
                          ({item.percentage}%)
                        </span>
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div
                      style={{
                        height: 5,
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: 3,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.min(100, item.percentage)}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, #10b981 0%, #34d399 100%)',
                          borderRadius: 3,
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Column 2: Cash Outflows Uses */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              padding: 16,
              background: 'rgba(244, 63, 94, 0.025)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(244, 63, 94, 0.15)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px solid rgba(244, 63, 94, 0.15)', paddingBottom: 10 }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Uses of Cash (Outflows)
                </span>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
                  -{fmt_usd(totalOutflows)}
                </div>
              </div>
              <span className="badge-pill low" style={{ fontSize: 10 }}>
                Disbursements &amp; Fees
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
              {outflows.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  No categorized outflow data available.
                </div>
              ) : (
                outflows.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                        {item.category}
                      </span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>
                        {fmt_usd(item.amount)}
                        <span style={{ color: 'var(--text-muted)', fontSize: 11, marginLeft: 6 }}>
                          ({item.percentage}%)
                        </span>
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div
                      style={{
                        height: 5,
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: 3,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.min(100, item.percentage)}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, #f43f5e 0%, #fb7185 100%)',
                          borderRadius: 3,
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Operating Cash Generation Ratio Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
            padding: '10px 14px',
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            fontSize: 12,
          }}
        >
          <span style={{ color: 'var(--text-muted)' }}>
            Operating Inflow-to-Outflow Coverage Ratio:
          </span>
          <span style={{ fontWeight: 700, color: totalOutflows > 0 && totalInflows / totalOutflows >= 1 ? 'var(--green)' : 'var(--yellow)', fontFamily: "'JetBrains Mono', monospace" }}>
            {totalOutflows > 0 ? (totalInflows / totalOutflows).toFixed(2) : '—'}x
            <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 6 }}>
              ({((totalInflows - totalOutflows) / (totalInflows || 1) * 100).toFixed(1)}% cash retention)
            </span>
          </span>
        </div>
      </div>
    </div>
  );
};
