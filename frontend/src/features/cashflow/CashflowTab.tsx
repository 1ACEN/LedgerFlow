import { useEffect, useState } from 'react';
import { fetchCashflow, type CashflowResponse } from './useCashflow';
import CashflowKpiStrip from './CashflowKpiStrip';
import ForecastFanChart from './ForecastFanChart';
import WeeklyFlowChart from './WeeklyFlowChart';
import WeeklyFlowTable from './WeeklyFlowTable';

interface Props {
  refreshKey?: number;
}

export default function CashflowTab({ refreshKey }: Props) {
  const [data, setData] = useState<CashflowResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    fetchCashflow()
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
            <div className="empty-state-title">Failed to load Cash Flow &amp; Forecast</div>
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
          <div className="card-icon purple">🔮</div>
          <span className="card-title">Cash Flow &amp; Predictive Forecasting</span>
        </div>
        <div className="card-body">
          <div className="skeleton" style={{ height: '44px', marginBottom: '16px' }}></div>
          <div className="skeleton" style={{ height: '320px' }}></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <CashflowKpiStrip forecast={data.forecast} weekly={data.weekly} />

      <ForecastFanChart forecast={data.forecast} />

      <div className="grid-2" style={{ marginTop: '16px' }}>
        <WeeklyFlowChart weekly={data.weekly} />
        <WeeklyFlowTable weekly={data.weekly} />
      </div>
    </>
  );
}
