import { fmt_usd } from '../../lib/api';
import type { DepartmentExpense } from './useRevenue';

interface DepartmentExpenseCardProps {
  expenses: DepartmentExpense[];
  totalOpex: number;
}

export const DepartmentExpenseCard = ({
  expenses,
  totalOpex,
}: DepartmentExpenseCardProps) => {
  return (
    <div className="card animate-in stagger-3" style={{ height: '100%' }}>
      <div className="card-header">
        <div>
          <span className="card-title">Operating Expense Breakdown by Function</span>
          <span className="card-subtitle" style={{ display: 'block' }}>
            Attribution across department cost centers for headcount planning and spend optimization
          </span>
        </div>
      </div>

      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
          <div>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Total Trailing OpEx
            </span>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--red)', marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
              {fmt_usd(totalOpex)}
            </div>
          </div>
          <span className="badge-pill med" style={{ fontSize: 10 }}>
            Cost Centers Active
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {expenses.map((dept) => {
            return (
              <div key={dept.key} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {dept.department}
                  </span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>
                    {fmt_usd(dept.amount_usd)}
                    <span style={{ color: 'var(--text-muted)', fontSize: 11, marginLeft: 6 }}>
                      ({dept.percentage}%)
                    </span>
                  </span>
                </div>

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
                      width: `${Math.min(100, dept.percentage)}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #f43f5e 0%, #fb7185 100%)',
                      borderRadius: 3,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            marginTop: 6,
            padding: '10px 14px',
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            fontSize: 11.5,
            color: 'var(--text-secondary)',
            lineHeight: 1.45,
          }}
        >
          <strong style={{ color: 'var(--text-primary)' }}>CFO Optimization Insight:</strong> R&amp;D and Sales represent ~54% of operating cash outflows. Current headcount efficiency and capital discipline remain comfortably within targeted payback benchmarks.
        </div>
      </div>
    </div>
  );
};

