// Data access for the AR Aging report. Mirrors the /reports/ar-aging
// response shape from scripts/api/webhooks.py one-for-one.

export interface ArAgingRow {
  customer_id: string;
  customer_name: string | null;
  invoices: number;
  total: number;
  current: number;
  days_31_60: number;
  days_61_90: number;
  days_90_plus: number;
}

export interface ArAgingResponse {
  aging: ArAgingRow[];
}

export const AR_SEVERITY = {
  current: 'current',
  moderate: 'moderate',
  elevated: 'elevated',
  critical: 'critical',
} as const;

export type ArSeverity = (typeof AR_SEVERITY)[keyof typeof AR_SEVERITY];

// Ported from loadArAgingReport()'s arSeverity() in live_input.html.
export function arSeverity(row: Pick<ArAgingRow, 'days_90_plus' | 'days_61_90' | 'days_31_60'>): ArSeverity {
  if (row.days_90_plus > 0) return AR_SEVERITY.critical;
  if (row.days_61_90 > 0) return AR_SEVERITY.elevated;
  if (row.days_31_60 > 0) return AR_SEVERITY.moderate;
  return AR_SEVERITY.current;
}

// Ported from the top-overdue spotlight logic: 90+ balances only, highest first, top 5.
export function topOverdue(aging: ArAgingRow[], limit = 5): ArAgingRow[] {
  return aging
    .filter((row) => row.days_90_plus > 0)
    .sort((a, b) => b.days_90_plus - a.days_90_plus)
    .slice(0, limit);
}

// Ported from the KPI reduce math in loadArAgingReport().
export function arKpis(aging: ArAgingRow[]) {
  const totalOut = aging.reduce((s, x) => s + x.total, 0);
  const invoices = aging.reduce((s, x) => s + x.invoices, 0);
  const overdue90 = aging.reduce((s, x) => s + x.days_90_plus, 0);
  return {
    total: totalOut,
    invoices,
    customers: aging.length,
    avgInvoice: invoices ? totalOut / invoices : 0,
    overduePct: totalOut ? Math.round((overdue90 / totalOut) * 100) : 0,
  };
}

export async function fetchArAging(): Promise<ArAgingResponse> {
  const r = await fetch('/reports/ar-aging');
  if (!r.ok) throw new Error(`ar-aging returned ${r.status}`);
  return (await r.json()) as ArAgingResponse;
}