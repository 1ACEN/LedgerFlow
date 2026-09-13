export interface TabDef {
  id: string;
  label: string;
  icon: string;
}

// The 6 tabs of the classic dashboard. Only 'ar-aging' is ported to React
// so far; the rest render NotPortedPanel with a link to the classic app.
export const TABS: TabDef[] = [
  { id: 'live-pipeline', label: 'Live Pipeline', icon: '⚡' },
  { id: 'executive', label: 'Executive Overview', icon: '📈' },
  { id: 'cashflow', label: 'Cash Flow & Forecast', icon: '🔮' },
  { id: 'revenue', label: 'CFO & Revenue', icon: '📊' },
  { id: 'ops', label: 'Fintech Ops & AI', icon: '🛡️' },
  { id: 'ar-aging', label: 'AR Aging', icon: '📑' },
];

export const PORTED_TABS = new Set(['ar-aging', 'revenue', 'cashflow', 'executive']);