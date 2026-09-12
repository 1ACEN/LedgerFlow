import { useEffect, useState } from 'react';
import { fetchRevenue, type RevenueResponse } from './useRevenue';
import RevenueKpiStrip from './RevenueKpiStrip';
import RevenueProductBars from './RevenueProductBars';
import RevenueGrowthCombo from './RevenueGrowthCombo';
import RevenueMixChart from './RevenueMixChart';
import IncomeStatementTable from './IncomeStatementTable';

interface Props {
  refreshKey?: number;
}

export default function RevenueTab({ refreshKey }: Props) {
  const [data, setData] = useState<RevenueResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    fetchRevenue()
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [reloadCount, refreshKey]);

  if (error) {
    return (
      <div className="card animate-in">
        <div className="card-body">
          <div className="empty-state">
            <div className="empty-state-icon">⚠️</div>
            <div className="empty-state-title">Failed to load CFO &amp; Revenue report</div>
            <div className="empty-state-desc">{error}</div>
            <button
              className="tab-btn active"
              onClick={() => setReloadCount((c) => c + 1)}
              style={{ width: 'fit-content', marginTop: '12px' }}
            >
              Try Again 🔄
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="card animate-in">
        <div className="card-header">
          <div className="card-icon blue">📊</div>
          <span className="card-title">CFO &amp; Revenue Analytics</span>
        </div>
        <div className="card-body">
          <div className="skeleton" style={{ height: '44px', marginBottom: '16px' }}></div>
          <div className="skeleton" style={{ height: '280px' }}></div>
        </div>
      </div>
    );
  }

  const rows = data.revenue_by_product;

  return (
    <>
      <RevenueKpiStrip rows={rows} />

      <div className="grid-2">
        <RevenueProductBars rows={rows} />
        <RevenueGrowthCombo rows={rows} />
      </div>

      <div className="grid-2" style={{ marginTop: '16px' }}>
        <RevenueMixChart rows={rows} />
        <IncomeStatementTable rows={rows} />
      </div>
    </>
  );
}
