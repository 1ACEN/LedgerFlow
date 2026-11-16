import { fmt_usd } from '../../lib/api';
import type { DepartmentExpense } from './useRevenue';
import { useCrossFilter } from '../../lib/CrossFilterContext';

interface DepartmentExpenseCardProps {
  expenses: DepartmentExpense[];
  totalOpex: number;
}

export const DepartmentExpenseCard = ({
  expenses,
  totalOpex,
}: DepartmentExpenseCardProps) => {
  const { filters, toggleFilter } = useCrossFilter();
  const selectedDept = filters.department;

  return (
    <div className="card animate-in stagger-3" style={{ height: '100%' }}>
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <span className="card-title">Operating Expense Breakdown by Function</span>
          <span className="card-subtitle" style={{ display: 'block' }}>
            Attribution across department cost centers for headcount planning and spend optimization
          </span>
        </div>
        <span
          style={{
            fontSize: 10,
            color: 'var(--text-muted)',
            border: '1px dashed var(--border-color)',
            padding: '2px 6px',
            borderRadius: 4,
          }}
        >
          Click row to filter
        </span>
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
            {selectedDept ? `Filtering: ${selectedDept.toUpperCase()}` : 'Cost Centers Active'}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {expenses.map((dept) => {
            const isSelected = selectedDept === dept.key;
            const isAnySelected = !!selectedDept;
            const opacity = isAnySelected && !isSelected ? 0.38 : 1.0;

            return (
              <div
                key={dept.key}
                onClick={() => toggleFilter('department', dept.key)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 5,
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm, 6px)',
                  background: isSelected ? 'var(--accent-soft)' : 'transparent',
                  border: isSelected ? '1px solid var(--accent)' : '1px solid transparent',
                  cursor: 'pointer',
                  opacity,
                  transition: 'all 0.18s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    (e.currentTarget as HTMLElement).style.background = 'var(--bg-secondary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ fontWeight: 600, color: isSelected ? 'var(--accent)' : 'var(--text-primary)' }}>
                    {isSelected ? '✓ ' : ''}{dept.department}
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
                    background: 'var(--track-bg)',
                    borderRadius: 3,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${Math.min(100, dept.percentage)}%`,
                      height: '100%',
                      background: isSelected
                        ? 'var(--accent)'
                        : 'linear-gradient(90deg, #f43f5e 0%, #fb7185 100%)',
                      borderRadius: 3,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
