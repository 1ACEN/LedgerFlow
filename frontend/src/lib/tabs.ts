export interface TabDef {
  id: string;
  label: string;
  icon: string;
}

// The 6 tabs of the financial dashboard.
export const TABS: TabDef[] = [
  { id: 'live-pipeline', label: 'Live Pipeline', icon: '' },
  { id: 'executive', label: 'Executive Overview', icon: '' },
  { id: 'cashflow', label: 'Cash Flow & Forecast', icon: '' },
  { id: 'revenue', label: 'CFO & Revenue', icon: '' },
  { id: 'ops', label: 'Fintech Ops & AI', icon: '' },
  { id: 'ar-aging', label: 'AR Aging', icon: '' },
];

export const PORTED_TABS = new Set(['ar-aging', 'revenue', 'cashflow', 'executive', 'ops', 'live-pipeline']);