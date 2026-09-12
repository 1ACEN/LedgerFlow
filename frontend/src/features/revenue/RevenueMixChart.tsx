import { useMemo } from 'react';
import type { ChartConfiguration, TooltipItem } from 'chart.js';
import ChartBox from '../../components/charts/ChartBox';
import { fmt_usd } from '../../lib/api';
import { computeProductTotals, type RevenueRow } from './useRevenue';

interface Props {
  rows: RevenueRow[];
}

const MIX_COLORS = [
  'rgba(59,130,246,0.85)',
  'rgba(16,185,129,0.85)',
  'rgba(245,158,11,0.85)',
  'rgba(139,92,246,0.85)',
  'rgba(6,182,212,0.85)',
  'rgba(249,115,22,0.85)',
];

export default function RevenueMixChart({ rows }: Props) {
  const config = useMemo<ChartConfiguration>(() => {
    const products = computeProductTotals(rows);

    return {
      type: 'doughnut',
      data: {
        labels: products.map((p) => p.label),
        datasets: [
          {
            data: products.map((p) => p.total),
            backgroundColor: products.map((_, i) => MIX_COLORS[i % MIX_COLORS.length]),
            borderColor: '#0c1019',
            borderWidth: 2,
            hoverOffset: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: '#8da2c0',
              font: { size: 11 },
              padding: 14,
              usePointStyle: true,
              pointStyleWidth: 8,
            },
          },
          tooltip: {
            callbacks: {
              label: (ctx: TooltipItem<'doughnut'>) => {
                const total = (ctx.dataset.data as number[]).reduce((s, v) => s + v, 0);
                const pct = total ? Math.round(((ctx.parsed as number) / total) * 100) : 0;
                return ` ${ctx.label}: ${fmt_usd(ctx.parsed as number)} (${pct}%)`;
              },
            },
          },
        },
      },
    };
  }, [rows]);

  return (
    <div className="card animate-in stagger-2">
      <div className="card-header">
        <div className="card-icon purple">🍩</div>
        <span className="card-title">Product Line Revenue Mix</span>
        <span className="card-subtitle">TTM dollar &amp; share breakdown</span>
      </div>
      <div className="card-body">
        <ChartBox config={config} />
      </div>
    </div>
  );
}
