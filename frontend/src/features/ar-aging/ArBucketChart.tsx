import { useMemo } from 'react';
import type { ChartConfiguration, TooltipItem } from 'chart.js';
import ChartBox, { type ChartClickInfo } from '../../components/charts/ChartBox';
import { fmt_usd } from '../../lib/api';
import type { ArAgingRow } from './useArAging';
import { useCrossFilter } from '../../lib/CrossFilterContext';
import { dimColor } from '../../lib/crossFilterUtils';

interface Props {
  aging: ArAgingRow[];
}

const BUCKET_COLORS = [
  'rgba(16, 185, 129, 0.95)', // Current
  'rgba(245, 158, 11, 0.95)', // 31-60
  'rgba(249, 115, 22, 0.95)', // 61-90
  'rgba(244, 63, 94, 0.95)',  // 90+
];

const BUCKET_KEYS = ['current', 'days_31_60', 'days_61_90', 'days_90_plus'];

export default function ArBucketChart({ aging }: Props) {
  const { filters, toggleFilter } = useCrossFilter();
  const selectedBucket = filters.agingBucket;

  const config = useMemo<ChartConfiguration<'doughnut'>>(() => {
    const bucketVals = [
      aging.reduce((s, x) => s + x.current, 0),
      aging.reduce((s, x) => s + x.days_31_60, 0),
      aging.reduce((s, x) => s + x.days_61_90, 0),
      aging.reduce((s, x) => s + x.days_90_plus, 0),
    ];

    const isFiltered = !!selectedBucket;

    const backgroundColors = BUCKET_KEYS.map((k, i) => {
      const baseColor = BUCKET_COLORS[i];
      if (!isFiltered) return baseColor;
      return k === selectedBucket ? baseColor : dimColor(baseColor, 0.22);
    });

    const borderColors = BUCKET_KEYS.map((k) => {
      if (!isFiltered) return '#121827';
      return k === selectedBucket ? '#ffffff' : 'rgba(255, 255, 255, 0.08)';
    });

    const borderWidths = BUCKET_KEYS.map((k) => {
      if (!isFiltered) return 2;
      return k === selectedBucket ? 3 : 1;
    });

    return {
      type: 'doughnut',
      data: {
        labels: ['Current (<30d)', '31–60 Days', '61–90 Days', '90+ Days'],
        datasets: [
          {
            data: bucketVals,
            backgroundColor: backgroundColors,
            borderColor: borderColors,
            borderWidth: borderWidths,
            hoverOffset: 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#8da2c0',
              font: { size: 11 },
              padding: 16,
              usePointStyle: true,
              pointStyleWidth: 8,
            },
          },
          tooltip: {
            callbacks: {
              label: (ctx: TooltipItem<'doughnut'>) => {
                const tot = (ctx.dataset.data as number[]).reduce((s, v) => s + v, 0);
                const pct = tot ? Math.round(((ctx.parsed as number) / tot) * 100) : 0;
                return ` ${ctx.label}: ${fmt_usd(ctx.parsed as number)} (${pct}%)`;
              },
            },
          },
        },
      },
    };
  }, [aging, selectedBucket]);

  const handleElementClick = (info: ChartClickInfo) => {
    if (info && BUCKET_KEYS[info.index]) {
      toggleFilter('agingBucket', BUCKET_KEYS[info.index]);
    }
  };

  return (
    <div className="card animate-in stagger-2">
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span className="card-title">AR Outstanding by Aging Bucket</span>
          <span className="card-subtitle" style={{ display: 'block' }}>dollar concentration per bucket</span>
        </div>
        <span
          style={{
            fontSize: 10,
            color: 'var(--text-muted)',
            border: '1px dashed var(--border-color)',
            padding: '2px 6px',
            borderRadius: 4,
          }}
        >
          Click slice to filter table
        </span>
      </div>
      <div className="card-body">
        <ChartBox config={config} onElementClick={handleElementClick} />
      </div>
    </div>
  );
}
