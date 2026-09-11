import { useEffect, useState } from 'react';
import { fetchArAging, type ArAgingRow } from './useArAging';
import ArKpiStrip from './ArKpiStrip';
import ArBucketChart from './ArBucketChart';
import OverdueSpotlight from './OverdueSpotlight';
import ArAgingTable from './ArAgingTable';

export default function ArAgingTab() {
  const [aging, setAging] = useState<ArAgingRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchArAging()
      .then((data) => {
        if (!cancelled) setAging(data.aging);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="card animate-in">
        <div className="card-body">
          <div className="empty-state">
            <div className="empty-state-icon">⚠️</div>
            <div className="empty-state-title">Failed to load AR aging</div>
            <div className="empty-state-desc">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!aging) {
    return (
      <div className="card animate-in">
        <div className="card-header">
          <div className="card-icon green">📑</div>
          <span className="card-title">Accounts Receivable Aging Report</span>
        </div>
        <div className="card-body">
          <div className="skeleton" style={{ height: '44px', marginBottom: '16px' }}></div>
          <div className="skeleton" style={{ height: '280px' }}></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <ArKpiStrip aging={aging} />

      <div className="grid-2">
        <ArBucketChart aging={aging} />
        <OverdueSpotlight aging={aging} />
      </div>

      <div className="card animate-in" style={{ marginTop: '16px' }}>
        <div className="card-header">
          <div className="card-icon green">📑</div>
          <span className="card-title">Accounts Receivable Aging Report</span>
          <span className="card-subtitle">
            Accrual Basis Outstanding Invoices · rows colored by severity
          </span>
        </div>
        <ArAgingTable aging={aging} />
      </div>
    </>
  );
}