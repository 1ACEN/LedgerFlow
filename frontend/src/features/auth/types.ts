export interface UserRole {
  id: string;
  name: string;
  title: string;
  department: string;
  badge: string;
  badgeColor: string;
  allowedTabs: string[];
  description: string;
}

export interface AuthUser {
  username: string;
  displayName: string;
  role: UserRole;
  avatar: string;
}

export const ROLES: Record<string, UserRole> = {
  admin: {
    id: 'admin',
    name: 'Administrator',
    title: 'Global System Administrator',
    department: 'Executive Operations & Infrastructure',
    badge: 'Super Admin',
    badgeColor: '#38bdf8',
    allowedTabs: ['executive', 'cashflow', 'revenue', 'ops', 'ar-aging', 'live-pipeline'],
    description: 'Unrestricted full access to all 6 financial telemetry & intelligence tabs.',
  },
  executive: {
    id: 'executive',
    name: 'Sarah Chen',
    title: 'Chief Executive Officer (CEO)',
    department: 'Executive Committee',
    badge: 'Executive',
    badgeColor: '#a855f7',
    allowedTabs: ['executive', 'cashflow', 'revenue', 'live-pipeline'],
    description: 'High-level executive KPIs, burn rate, cash runway & macro revenue trajectories.',
  },
  cfo: {
    id: 'cfo',
    name: 'Marcus Vance',
    title: 'Chief Financial Officer (CFO)',
    department: 'Finance & Treasury',
    badge: 'CFO / Treasury',
    badgeColor: '#3b82f6',
    allowedTabs: ['revenue', 'cashflow', 'ar-aging', 'executive'],
    description: 'Strategic margin intelligence, cash forecasts, budget variances & receivables.',
  },
  ops: {
    id: 'ops',
    name: 'Elena Rostova',
    title: 'VP of Fintech Operations & AI',
    department: 'Payment Engineering & AI Ops',
    badge: 'Fintech Ops',
    badgeColor: '#10b981',
    allowedTabs: ['ops', 'live-pipeline', 'executive'],
    description: 'Real-time transaction surveillance, AI anomaly telemetry & payment rail latency.',
  },
  credit: {
    id: 'credit',
    name: 'David Sterling',
    title: 'Credit & AR Risk Lead',
    department: 'Credit Management & Collections',
    badge: 'Credit & Risk',
    badgeColor: '#f59e0b',
    allowedTabs: ['ar-aging', 'cashflow'],
    description: 'Collections velocity, aging buckets, dunning workflows & bad debt reserves.',
  },
};

export const DEMO_CREDENTIALS = [
  { username: 'admin', password: 'admin', roleId: 'admin', label: '👑 Admin (All Pages)' },
  { username: 'executive', password: 'exec', roleId: 'executive', label: '👔 CEO / Executive' },
  { username: 'cfo', password: 'cfo', roleId: 'cfo', label: '📊 CFO / Finance' },
  { username: 'ops', password: 'ops', roleId: 'ops', label: '⚡ Fintech Ops & AI' },
  { username: 'credit', password: 'credit', roleId: 'credit', label: '📑 Credit & AR' },
];

