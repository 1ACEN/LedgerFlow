// Shared API + formatting helpers ported from scripts/api/live_input.html.

export function fmt_usd(v: number | null | undefined): string {
  if (v == null || isNaN(v)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(v);
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 5) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export const CHART_LEGEND = {
  labels: {
    color: '#8da2c0',
    font: { size: 11 },
    padding: 16,
    usePointStyle: true,
    pointStyleWidth: 8,
  },
} as const;