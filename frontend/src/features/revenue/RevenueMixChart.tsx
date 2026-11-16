import { useMemo } from 'react';
import type { ChartConfiguration, TooltipItem } from 'chart.js';
import ChartBox, { type ChartClickInfo } from '../../components/charts/ChartBox';
import { fmt_usd } from '../../lib/api';
import { computeProductTotals, type RevenueRow } from './useRevenue';
import { useCrossFilter } from '../../lib/CrossFilterContext';
import { dimColor } from '../../lib/crossFilterUtils';

interface Props {
  rows: RevenueRow[];
}

const MIX_COLORS = [
  'rgba(59, 130, 246, 0.95)',
  'rgba(16, 185, 129, 0.95)',
  'rgba(245, 158, 11, 0.95)',
  'rgba(139, 92, 246, 0.95)',
  'rgba(14, 165, 233, 0.95)',
  'rgba(249, 115, 22, 0.95)',
];

export default function RevenueMixChart({ rows }: Props) {
  const { filters, toggleFilter } = useCrossFilter();

  // If a month is selected, compute product mix strictly for that month
  const activeRows = useMemo(() => {
    if (filters.month) {
      const match = rows.filter((r) => r.month.slice(0, 7) === filters.month);
      return match.length > 0 ? match : rows;
    }
    return rows;
  }, [rows, filters.month]);

  const products = useMemo(() => computeProductTotals(activeRows), [activeRows]);

  const config = useMemo<ChartConfiguration<'doughnut'>>(() => {
    const isProductFiltered = !!filters.productLine;

    const backgroundColors = products.map((p, i) => {
      const baseColor = MIX_COLORS[i % MIX_COLORS.length];
      if (!isProductFiltered) return baseColor;
      return p.productLine === filters.productLine ? baseColor : dimColor(baseColor, 0.22);
    });

    const borderColors = products.map((p) => {
      if (!isProductFiltered) return '#121827';
      return p.productLine === filters.productLine ? '#ffffff' : 'rgba(255, 255, 255, 0.08)';
    });

    const borderWidths = products.map((p) => {
      if (!isProductFiltered) return 2;
      return p.productLine === filters.productLine ? 3 : 1;
    });

    return {
      type: 'doughnut',
      data: {
        labels: products.map((p) => p.label),
        datasets: [
          {
            data: products.map((p) => p.total),
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
  }, [products, filters.productLine]);

  const handleElementClick = (info: ChartClickInfo) => {
    if (info && products[info.index]) {
      toggleFilter('productLine', products[info.index].productLine);
    }
  };

  return (
    <div className="card animate-in stagger-2">
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span className="card-title">Product Line Revenue Mix</span>
          <span className="card-subtitle" style={{ display: 'block' }}>
            {filters.month ? `Month ${filters.month} breakdown` : 'TTM dollar & share breakdown'}
          </span>
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
          Click slice to cross-filter
        </span>
      </div>
      <div className="card-body">
        <ChartBox config={config} onElementClick={handleElementClick} />
      </div>
    </div>
  );
}
