import { useMemo } from 'react';
import type { ChartConfiguration, TooltipItem } from 'chart.js';
import ChartBox from '../../components/charts/ChartBox';
import { fmt_usd } from '../../lib/api';
import type { ArAgingRow } from './useArAging';

interface Props {
  aging: ArAgingRow[];
}

const BUCKET_COLORS = [
  'rgba(16,185,129,0.85)', // Current
  'rgba(245,158,11,0.85)', // 31-60
  'rgba(249,115,22,0.85)', // 61-90
  'rgba(239,68,68,0.85)',  // 90+
];

// Doughnut of dollar concentration per aging bucket. Config ports the
// chart-ar-buckets block verbatim (colors, border, cutout, legend, and the
// $ + % tooltip callback).
export default function ArBucketChart({ aging }: Props) {
  const config = useMemo<ChartConfiguration>(() => {
    const bucketVals = [
      aging.reduce((s, x) => s + x.current, 0),
      aging.reduce((s, x) => s + x.days_31_60, 0),
      aging.reduce((s, x) => s + x.days_61_90, 0),
      aging.reduce((s, x) => s + x.days_90_plus, 0),
    ];

    return {
      type: 'doughnut',
      data: {
        labels: ['Current (<30d)', '31–60 Days', '61–90 Days', '90+ Days'],
        datasets: [
          {
            data: bucketVals,
            backgroundColor: BUCKET_COLORS,
            borderColor: '#0c1019',
            borderWidth: 2,
            hoverOffset: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: { position: 'bottom', labels: { color: '#8da2c0', font: { size: 11 }, padding: 16, usePointStyle: true, pointStyleWidth: 8 } },
          tooltip: {
            callbacks: {
              label: (ctx: TooltipItem<'doughnut'>) => {
                const tot = (ctx.dataset.data as number[]).reduce((s, v) => s + v, 0);
                const pct = tot ? Math.round((ctx.parsed as number / tot) * 100) : 0;
                return ` ${ctx.label}: ${fmt_usd(ctx.parsed as number)} (${pct}%)`;
              },
            },
          },
        },
      },
    };
  }, [aging]);

  return (
    <div className="card animate-in stagger-2">
      <div className="card-header">
        <div className="card-icon red">📊</div>
        <span className="card-title">AR Outstanding by Aging Bucket</span>
        <span className="card-subtitle">dollar concentration per bucket</span>
      </div>
      <div className="card-body">
        <ChartBox config={config} />
      </div>
    </div>
  );
}