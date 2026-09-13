import React, { useState } from 'react';
import type { ManualTransactionPayload } from './useLivePipeline';

interface ManualTransactionFormProps {
  onSubmit: (payload: ManualTransactionPayload) => Promise<boolean>;
  submitting: boolean;
  submitResult: { success: boolean; message: string } | null;
  onDismissResult: () => void;
}

export const ManualTransactionForm: React.FC<ManualTransactionFormProps> = ({
  onSubmit,
  submitting,
  submitResult,
  onDismissResult,
}) => {
  const [amount, setAmount] = useState<string>('');
  const [type, setType] = useState<string>('charge');
  const [status, setStatus] = useState<string>('succeeded');
  const [source, setSource] = useState<string>('manual');
  const [currency, setCurrency] = useState<string>('USD');
  const [productLine, setProductLine] = useState<string>('subscriptions');
  const [accountCode, setAccountCode] = useState<string>('4000-revenue');
  const [description, setDescription] = useState<string>('');
  const [declineCode, setDeclineCode] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    const payload: ManualTransactionPayload = {
      amount_usd: numAmount,
      type,
      status,
      source,
      currency,
      product_line: productLine,
      account_code: accountCode,
      description: description.trim() || undefined,
      decline_code: status === 'failed' && declineCode ? declineCode : undefined,
    };

    const ok = await onSubmit(payload);
    if (ok) {
      setAmount('');
      setDescription('');
      setDeclineCode('');
    }
  };

  return (
    <div className="card animate-in stagger-2">
      <div className="card-header">
        <div className="card-icon blue">✏️</div>
        <div>
          <span className="card-title">Live Manual Transaction Input</span>
          <span className="card-subtitle" style={{ display: 'block' }}>
            POST /transactions/manual · immediate ingestion into DuckDB
          </span>
        </div>
      </div>
      <div className="card-body">
        {submitResult && (
          <div
            className={`toast show ${submitResult.success ? 'success' : 'error'}`}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              background: submitResult.success ? 'var(--green-soft)' : 'var(--red-soft)',
              border: `1px solid ${submitResult.success ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
              color: submitResult.success ? 'var(--green)' : 'var(--red)',
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            <span>{submitResult.success ? '✅' : '❌'} {submitResult.message}</span>
            <button
              onClick={onDismissResult}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                fontSize: 14,
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>
        )}

        <form className="form" onSubmit={handleSubmit} autoComplete="off">
          {/* Amount Field */}
          <div className="field" style={{ marginBottom: 14 }}>
            <label htmlFor="amount_usd" style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
              Amount (USD) *
            </label>
            <div className="amount-wrapper" style={{ position: 'relative' }}>
              <span
                className="amount-prefix"
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  fontWeight: 600,
                }}
              >
                $
              </span>
              <input
                type="number"
                id="amount_usd"
                name="amount_usd"
                step="0.01"
                min="0.01"
                placeholder="249.99"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 28px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: 14,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              />
            </div>
          </div>

          {/* Row: Type & Status */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div className="field">
              <label htmlFor="type" style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
                Type
              </label>
              <select
                id="type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                }}
              >
                <option value="charge">Charge</option>
                <option value="refund">Refund</option>
                <option value="payout">Payout</option>
                <option value="fee">Fee</option>
                <option value="transfer">Transfer</option>
                <option value="invoice_payment">Invoice Payment</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="status" style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
                Status
              </label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                }}
              >
                <option value="succeeded">Succeeded ✅</option>
                <option value="failed">Failed ❌</option>
                <option value="pending">Pending ⏳</option>
                <option value="canceled">Canceled</option>
              </select>
            </div>
          </div>

          {/* Row: Gateway / Source & Currency */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div className="field">
              <label htmlFor="source" style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
                Gateway / Source
              </label>
              <select
                id="source"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                }}
              >
                <option value="manual">Manual Entry</option>
                <option value="stripe">Stripe</option>
                <option value="plaid">Plaid</option>
                <option value="ach">ACH</option>
                <option value="wire">Wire</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="currency" style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
                Currency
              </label>
              <select
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                }}
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>

          {/* Row: Product Line & Account Code */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div className="field">
              <label htmlFor="product_line" style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
                Product Line
              </label>
              <select
                id="product_line"
                value={productLine}
                onChange={(e) => setProductLine(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                }}
              >
                <option value="subscriptions">Subscriptions</option>
                <option value="professional_services">Professional Services</option>
                <option value="marketplace">Marketplace</option>
                <option value="ecommerce">Ecommerce</option>
                <option value="platform_fees">Platform Fees</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="account_code" style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
                Account Code
              </label>
              <select
                id="account_code"
                value={accountCode}
                onChange={(e) => setAccountCode(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                }}
              >
                <option value="4000-revenue">4000 – Revenue</option>
                <option value="4100-revenue">4100 – Revenue</option>
                <option value="4200-revenue">4200 – Revenue</option>
                <option value="4900-contra_revenue">4900 – Contra Revenue</option>
                <option value="6000-expense">6000 – Expense</option>
                <option value="1010-checking">1010 – Checking</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="field" style={{ marginBottom: 14 }}>
            <label htmlFor="description" style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
              Description
            </label>
            <input
              type="text"
              id="description"
              placeholder="e.g. Enterprise Monthly License"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                fontSize: 13,
              }}
            />
          </div>

          {/* Conditional Decline Code when status is failed */}
          {status === 'failed' && (
            <div className="field animate-in" style={{ marginBottom: 14 }}>
              <label htmlFor="decline_code" style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--red)' }}>
                Decline Code *
              </label>
              <select
                id="decline_code"
                value={declineCode}
                onChange={(e) => setDeclineCode(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  background: 'var(--bg-input)',
                  border: '1px solid rgba(239,68,68,0.4)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                }}
              >
                <option value="">— select decline reason —</option>
                <option value="insufficient_funds">insufficient_funds</option>
                <option value="card_declined">card_declined</option>
                <option value="expired_card">expired_card</option>
                <option value="do_not_honor">do_not_honor</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            className="submit-btn"
            disabled={submitting}
            style={{
              width: '100%',
              padding: '11px 16px',
              background: 'var(--accent)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              color: '#ffffff',
              fontSize: 13,
              fontWeight: 600,
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.7 : 1,
              transition: 'var(--transition)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 0 16px var(--accent-glow)',
            }}
          >
            {submitting ? 'Ingesting…' : '➕ Ingest Live Transaction'}
          </button>
        </form>
      </div>
    </div>
  );
};
