import { useState } from 'react';
import { fmt_usd } from '../../lib/api';
import type { CustomerTierRevenue, TopCustomer } from './useRevenue';
import { useCrossFilter } from '../../lib/CrossFilterContext';

interface CustomerSegmentationCardProps {
  tiers: CustomerTierRevenue[];
  topCustomers: TopCustomer[];
}

export const CustomerSegmentationCard = ({
  tiers,
  topCustomers,
}: CustomerSegmentationCardProps) => {
  const [tab, setTab] = useState<'tiers' | 'accounts'>('tiers');
  const { filters, toggleFilter } = useCrossFilter();
  const selectedTier = filters.customerTier;

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
          <span className="card-title">Customer Revenue Segmentation &amp; Key Accounts</span>
          <span className="card-subtitle" style={{ display: 'block' }}>
            Portfolio distribution by subscription tier and revenue contribution from strategic accounts
          </span>
        </div>

        {/* Tab Toggle */}
        <div className="filter-group">
          <button
            className={`filter-btn ${tab === 'tiers' ? 'active' : ''}`}
            onClick={() => setTab('tiers')}
            style={{ fontSize: 11, padding: '3px 9px' }}
          >
            Tier Distribution
          </button>
          <button
            className={`filter-btn ${tab === 'accounts' ? 'active' : ''}`}
            onClick={() => setTab('accounts')}
            style={{ fontSize: 11, padding: '3px 9px' }}
          >
            Top Accounts (6)
          </button>
        </div>
      </div>

      <div className="card-body">
        {tab === 'tiers' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {tiers.map((tier) => {
              const arpu = tier.customer_count > 0 ? Math.round(tier.total_revenue / tier.customer_count) : 0;
              const isSelected = selectedTier === tier.plan_key;
              const isAnySelected = !!selectedTier;
              const opacity = isAnySelected && !isSelected ? 0.38 : 1.0;

              const barColor =
                tier.plan_key === 'enterprise'
                  ? 'linear-gradient(90deg, #8b5cf6 0%, #a855f7 100%)'
                  : tier.plan_key === 'pro'
                  ? 'linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)'
                  : tier.plan_key === 'starter'
                  ? 'linear-gradient(90deg, #10b981 0%, #34d399 100%)'
                  : 'linear-gradient(90deg, #0ea5e9 0%, #38bdf8 100%)';

              return (
                <div
                  key={tier.plan_key}
                  onClick={() => toggleFilter('customerTier', tier.plan_key)}
                  style={{
                    padding: '12px 14px',
                    background: isSelected ? 'var(--accent-soft)' : 'var(--surface-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    cursor: 'pointer',
                    opacity,
                    transition: 'all 0.18s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: isSelected ? 'var(--accent)' : 'var(--text-primary)' }}>
                        {isSelected ? '✓ ' : ''}{tier.tier}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        · {tier.customer_count.toLocaleString()} accounts
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>
                        {fmt_usd(tier.total_revenue)}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        ({tier.percentage}%)
                      </span>
                    </div>
                  </div>

                  {/* Proportion Progress Bar */}
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
                        width: `${Math.min(100, tier.percentage)}%`,
                        height: '100%',
                        background: barColor,
                        borderRadius: 3,
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)' }}>
                    <span>Average ARPU: {fmt_usd(arpu)} / customer</span>
                    <span>{tier.transactions_count.toLocaleString()} ledger events</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="table-container" style={{ maxHeight: 340 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Client / Enterprise</th>
                  <th>Subscription Tier</th>
                  <th>Geography</th>
                  <th style={{ textAlign: 'right' }}>Total LTV</th>
                  <th style={{ textAlign: 'right' }}>Txns</th>
                </tr>
              </thead>
              <tbody>
                {topCustomers.map((cust, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{cust.name}</td>
                    <td>
                      <span className="badge-pill low" style={{ textTransform: 'capitalize' }}>
                        {cust.tier}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
                        {cust.country}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {fmt_usd(cust.total_revenue)}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>
                      {cust.transactions_count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
