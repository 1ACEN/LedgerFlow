// Data access and calculation utilities for the Cash Flow & Forecast tab.
// Mirrors the /reports/cashflow response from scripts/api/webhooks.py.

export interface ForecastPoint {
  date: string;
  p10: number;
  p50: number;
  p90: number;
  inflows: number;
  outflows: number;
}

export interface WeeklyFlow {
  week: string;
  inflows: number;
  outflows: number;
  net: number;
}

export interface CashflowResponse {
  forecast: ForecastPoint[];
  weekly: WeeklyFlow[];
}

export interface CashflowKpis {
  projectedEndingCash: number;
  confidenceSpread: number;
  historical12wNet: number;
  avgWeeklyNet: number;
}

export function computeCashflowKpis(
  forecast: ForecastPoint[],
  weekly: WeeklyFlow[]
): CashflowKpis {
  let projectedEndingCash = 0;
  let confidenceSpread = 0;

  if (forecast && forecast.length > 0) {
    const latest = forecast[forecast.length - 1];
    projectedEndingCash = latest.p50;
    confidenceSpread = Math.max(0, Math.round((latest.p90 - latest.p10) * 100) / 100);
  }

  let historical12wNet = 0;
  let avgWeeklyNet = 0;

  if (weekly && weekly.length > 0) {
    historical12wNet = Math.round(weekly.reduce((s, w) => s + (w.net || 0), 0) * 100) / 100;
    avgWeeklyNet = Math.round((historical12wNet / weekly.length) * 100) / 100;
  }

  return {
    projectedEndingCash,
    confidenceSpread,
    historical12wNet,
    avgWeeklyNet,
  };
}

export async function fetchCashflow(): Promise<CashflowResponse> {
  const r = await fetch('/reports/cashflow');
  if (!r.ok) throw new Error(`reports/cashflow returned ${r.status}`);
  return (await r.json()) as CashflowResponse;
}
