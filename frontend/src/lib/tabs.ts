export interface TabDef {
  id: string;
  label: string;
}

// The tabs of the financial dashboard.
export const TABS: TabDef[] = [
  { id: 'executive', label: 'Executive Overview' },
  { id: 'cashflow', label: 'Cash Flow & Forecast' },
  { id: 'revenue', label: 'CFO & Revenue' },
  { id: 'ops', label: 'Fintech Ops & AI' },
  { id: 'ar-aging', label: 'AR Aging' },
  { id: 'live-pipeline', label: 'Live Pipeline' },
];

export const PORTED_TABS = new Set([
  'ar-aging',
  'revenue',
  'cashflow',
  'executive',
  'ops',
  'live-pipeline',
]);