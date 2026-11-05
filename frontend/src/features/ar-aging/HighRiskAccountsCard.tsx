import { useState } from 'react';
import { fmt_usd } from '../../lib/api';
import type { HighRiskAccount } from './useArAging';

interface Props {
  accounts: HighRiskAccount[];
}

export default function HighRiskAccountsCard({ accounts }: Props) {
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const handleAction = (customer: string, action: string) => {
    setActionNotice(`✓ Triggered: "${action}" for ${customer}`);
    setTimeout(() => {
      setActionNotice(null);
    }, 3500);
  };

  return (
    <div className="card animate-in" style={{ padding: '20px 22px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
              High-Risk Overdue Accounts Queue
            </span>
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: 4,
                background: 'rgba(244, 63, 94, 0.12)',
                color: '#f43f5e',
                border: '1px solid rgba(244, 63, 94, 0.25)',
              }}
            >
              Action Required ({accounts.length})
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-secondary)' }}>
            Prioritized delinquent accounts with 90+ day exposures requiring formal dunning escalation or credit freeze
          </p>
        </div>
      </div>

      {actionNotice && (
        <div
          style={{
            marginBottom: 14,
            padding: '10px 14px',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 6,
            color: '#34d399',
            fontSize: 12,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{actionNotice}</span>
          <button
            onClick={() => setActionNotice(null)}
            style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 14 }}
          >
            ✕
          </button>
        </div>
      )}

      {accounts.length === 0 ? (
        <div className="empty-state" style={{ padding: '32px' }}>
          <div className="empty-state-title">No Critical Overdue Accounts</div>
          <div className="empty-state-desc">All customer accounts are operating within approved terms.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {accounts.map((acc, index) => {
            const isCritical = acc.risk_tier === 'Critical';
            return (
              <div
                key={acc.customer_id}
                style={{
                  background: 'var(--surface-subtle)',
                  border: `1px solid ${isCritical ? 'rgba(244, 63, 94, 0.25)' : 'var(--border)'}`,
                  borderLeft: `4px solid ${isCritical ? '#f43f5e' : '#f59e0b'}`,
                  borderRadius: 6,
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                {/* Left: Customer info & exposure */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 260 }}>
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: 'var(--pill-bg)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <strong style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                        {acc.customer_name}
                      </strong>
                      <span
                        style={{
                          fontSize: 9.5,
                          fontWeight: 700,
                          padding: '1px 5px',
                          borderRadius: 3,
                          background: 'var(--pill-bg)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {acc.plan}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {acc.customer_id} · {acc.invoices} open invoice{acc.invoices > 1 ? 's' : ''} · ~{acc.days_overdue_estimate}d overdue
                    </div>
                  </div>
                </div>

                {/* Middle: Financial amounts */}
                <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Total Balance</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {fmt_usd(acc.total)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>90+ Days Exposure</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#f43f5e' }}>
                      {fmt_usd(acc.days_90_plus)}
                    </div>
                  </div>
                </div>

                {/* Right: Dunning stage & quick action triggers */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ textAlign: 'right' }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 7px',
                        borderRadius: 4,
                        background: isCritical ? 'rgba(244, 63, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: isCritical ? '#fb7185' : '#fbbf24',
                        display: 'inline-block',
                      }}
                    >
                      {acc.dunning_stage}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => handleAction(acc.customer_name, 'Legal Demand Letter')}
                      style={{
                        padding: '5px 10px',
                        fontSize: 11,
                        fontWeight: 600,
                        background: 'rgba(244, 63, 94, 0.12)',
                        color: '#f43f5e',
                        border: '1px solid rgba(244, 63, 94, 0.3)',
                        borderRadius: 4,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      Demand Notice
                    </button>
                    <button
                      onClick={() => handleAction(acc.customer_name, 'Log Promise to Pay')}
                      style={{
                        padding: '5px 10px',
                        fontSize: 11,
                        fontWeight: 600,
                        background: 'var(--pill-bg)',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border)',
                        borderRadius: 4,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      Log Promise
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

