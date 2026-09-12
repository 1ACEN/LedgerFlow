import { fmt_usd } from '../../lib/api';
import {
  computeCashflowKpis,
  type ForecastPoint,
  type WeeklyFlow,
} from './useCashflow';

interface Props {
  forecast: ForecastPoint[];
  weekly: WeeklyFlow[];
}

export default function CashflowKpiStrip({ forecast, weekly }: Props) {
  const k = computeCashflowKpis(forecast, weekly);

  return (
    <div className="grid-4">
      <div className="metric-card animate-in stagger-1">
        <div className="metric-label">Projected Ending Cash</div>
        <div className="metric-value" style={{ color: 'var(--green)' }}>
          {fmt_usd(k.projectedEndingCash)}
        </div>
        <div className="metric-sub">P50 expected at +13 weeks</div>
      </div>

      <div className="metric-card animate-in stagger-2">
        <div className="metric-label">Forecast Confidence Range</div>
        <div className="metric-value" style={{ color: 'var(--accent)' }}>
          ±{fmt_usd(k.confidenceSpread / 2)}
        </div>
        <div className="metric-sub">
          {fmt_usd(k.confidenceSpread)} P90–P10 spread
        </div>
      </div>

      <div className="metric-card animate-in stagger-3">
        <div className="metric-label">12-Week Net Flow</div>
        <div
          className="metric-value"
          style={{
            color: k.historical12wNet >= 0 ? 'var(--green)' : 'var(--red)',
          }}
        >
          {fmt_usd(k.historical12wNet)}
        </div>
        <div className="metric-sub">historical operating net cash</div>
      </div>

      <div className="metric-card animate-in stagger-4">
        <div className="metric-label">Avg Weekly Net Flow</div>
        <div
          className="metric-value"
          style={{
            fontSize: '24px',
            marginTop: '5px',
            color: k.avgWeeklyNet >= 0 ? 'var(--yellow)' : 'var(--orange)',
          }}
        >
          {fmt_usd(k.avgWeeklyNet)}
        </div>
        <div className="metric-sub">rolling 12-week average</div>
      </div>
    </div>
  );
}
