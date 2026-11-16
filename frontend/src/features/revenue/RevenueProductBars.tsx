import { useMemo } from 'react';
import type { ChartConfiguration, TooltipItem } from 'chart.js';
import ChartBox, { type ChartClickInfo } from '../../components/charts/ChartBox';
import { fmt_usd } from '../../lib/api';
import { formatProductLine, type RevenueRow } from './useRevenue';
import { useCrossFilter } from '../../lib/CrossFilterContext';
import { dimColor } from '../../lib/crossFilterUtils';

interface Props {
  rows: RevenueRow[];
}

const PRODUCT_COLORS = [
  'rgba(59,130,246,0.92)',  // subscriptions (blue)
  'rgba(16,185,129,0.92)',  // services (green)
  'rgba(245,158,11,0.92)',  // marketplace (yellow)
  'rgba(139,92,246,0.92)',  // ecommerce (purple)
  'rgba(6,182,212,0.92)',   // platform fees (cyan)
  'rgba(249,115,22,0.92)',  // extra (orange)
];

export default function RevenueProductBars({ rows }: Props) {
  const { filters, toggleFilter } = useCrossFilter();

  const { months, products, datasets } = useMemo(() => {
    const monthSet = new Set<string>();
    const prodSet = new Set<string>();
    for (const r of rows) {
      monthSet.add(r.month);
      prodSet.add(r.product_line);
    }
    const sortedMonths = Array.from(monthSet).sort();
    const sortedProducts = Array.from(prodSet).sort();

    const isProdFiltered = !!filters.productLine;
    const isMonthFiltered = !!filters.month;

    const builtDatasets = sortedProducts.map((prod, i) => {
      const isThisProd = prod === filters.productLine;
      const baseColor = PRODUCT_COLORS[i % PRODUCT_COLORS.length];
      const data = sortedMonths.map((m) => {
        const match = rows.find((r) => r.month === m && r.product_line === prod);
        return match ? match.revenue : 0;
      });

      // Power BI-style highlighting: per-bar color adjustment for both month and product
      const backgroundColors = sortedMonths.map((m) => {
        const isThisMonth = m.slice(0, 7) === filters.month;
        if (isProdFiltered && !isThisProd) {
          return dimColor(baseColor, 0.18);
        }
        if (isMonthFiltered && !isThisMonth) {
          return dimColor(baseColor, 0.28);
        }
        return baseColor;
      });

      return {
        label: formatProductLine(prod),
        data,
        backgroundColor: backgroundColors,
        borderColor: isProdFiltered && isThisProd ? '#ffffff' : 'transparent',
        borderWidth: isProdFiltered && isThisProd ? 1.5 : 0,
        borderRadius: 4,
        borderSkipped: false,
        stack: 'total',
      };
    });

    return {
      months: sortedMonths,
      products: sortedProducts,
      datasets: builtDatasets,
    };
  }, [rows, filters.productLine, filters.month]);

  const config = useMemo<ChartConfiguration<'bar'>>(() => {
    return {
      type: 'bar',
      data: {
        labels: months.map((m) => {
          const shortMonth = m.slice(0, 7);
          return shortMonth === filters.month ? `▶ ${shortMonth}` : shortMonth;
        }),
        datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
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
              label: (ctx: TooltipItem<'bar'>) =>
                ` ${ctx.dataset.label}: ${fmt_usd(ctx.parsed.y)}`,
            },
          },
        },
        scales: {
          x: {
            stacked: true,
            grid: { display: false },
            ticks: {
              color: (ctx) => {
                const label = months[ctx.index]?.slice(0, 7);
                return label === filters.month ? '#60a5fa' : '#6b7fa0';
              },
              font: { size: 10, weight: 600 },
            },
            border: { display: false },
          },
          y: {
            stacked: true,
            grid: { color: 'rgba(99,120,170,0.08)' },
            ticks: {
              color: '#6b7fa0',
              font: { size: 10 },
              callback: (v: number | string) => {
                const num = typeof v === 'number' ? v : parseFloat(v);
                return '$' + (num / 1000).toFixed(0) + 'k';
              },
            },
            border: { display: false },
          },
        },
      },
    };
  }, [months, datasets, filters.month]);

  const handleElementClick = (info: ChartClickInfo) => {
    // If clicked on a bar: toggle the month
    if (info && months[info.index]) {
      const selectedMonth = months[info.index].slice(0, 7);
      // If datasetIndex is valid, also allow toggling product if user clicks a specific stack
      if (products[info.datasetIndex] && filters.month === selectedMonth) {
        toggleFilter('productLine', products[info.datasetIndex]);
      } else {
        toggleFilter('month', selectedMonth);
      }
    }
  };

  return (
    <div className="card animate-in stagger-1">
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span className="card-title">Monthly Revenue by Product Line</span>
          <span className="card-subtitle" style={{ display: 'block' }}>
            MoM stacked volume progression across revenue channels
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
          Click bar to filter month
        </span>
      </div>
      <div className="card-body">
        <ChartBox config={config} onElementClick={handleElementClick} />
      </div>
    </div>
  );
}
