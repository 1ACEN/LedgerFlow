import React, { useMemo } from 'react';
import type { ChartConfiguration } from 'chart.js';
import ChartBox from '../../components/charts/ChartBox';
import type { CashTrendPoint } from './useExecutive';
import { useCrossFilter } from '../../lib/CrossFilterContext';
import { dimColor } from '../../lib/crossFilterUtils';

interface DailyFlowsChartProps {
  trend: CashTrendPoint[];
}

function fmtUsdShort(v: number): string {
  if (Math.abs(v) >= 1_000_000) {
    return `$${(v / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(v) >= 1_000) {
    return `$${(v / 1_000).toFixed(0)}k`;
  }
  return `$${v.toFixed(0)}`;
}

function fmtUsdFull(v: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(v);
}

export const DailyFlowsChart: React.FC<DailyFlowsChartProps> = ({ trend }) => {
  const { filters, toggleFilter } = useCrossFilter();

  const chartConfig = useMemo<ChartConfiguration<'bar'>>(() => {
    const inflows = trend.map((pt) => pt.inflows);
    const outflows = trend.map((pt) => pt.outflows);

    const isDateFiltered = !!filters.date;
    const isMonthFiltered = !!filters.month && !isDateFiltered;

    const inflowColors = trend.map((pt) => {
      if (isDateFiltered) {
        return pt.date === filters.date
          ? 'rgba(59, 130, 246, 1)'
          : dimColor('rgba(59, 130, 246, 0.75)', 0.2);
      }
      if (isMonthFiltered) {
        return pt.date.startsWith(filters.month!)
          ? 'rgba(59, 130, 246, 0.95)'
          : dimColor('rgba(59, 130, 246, 0.75)', 0.25);
      }
      return 'rgba(59, 130, 246, 0.75)';
    });

    const outflowColors = trend.map((pt) => {
      if (isDateFiltered) {
        return pt.date === filters.date
          ? 'rgba(239, 68, 68, 1)'
          : dimColor('rgba(239, 68, 68, 0.65)', 0.2);
      }
      if (isMonthFiltered) {
        return pt.date.startsWith(filters.month!)
          ? 'rgba(239, 68, 68, 0.85)'
          : dimColor('rgba(239, 68, 68, 0.65)', 0.25);
      }
      return 'rgba(239, 68, 68, 0.65)';
    });

    return {
      type: 'bar',
      data: {
        labels: trend.map((pt) => {
          const short = pt.date.slice(5);
          return pt.date === filters.date ? `▶ ${short}` : short;
        }),
        datasets: [
          {
            label: 'Inflows',
            data: inflows,
            backgroundColor: inflowColors,
            hoverBackgroundColor: 'rgba(59, 130, 246, 0.95)',
            borderRadius: 4,
            borderSkipped: false,
            barPercentage: 0.7,
          },
          {
            label: 'Outflows',
            data: outflows,
            backgroundColor: outflowColors,
            hoverBackgroundColor: 'rgba(239, 68, 68, 0.85)',
            borderRadius: 4,
            borderSkipped: false,
            barPercentage: 0.7,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'index',
        },
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: {
              color: '#8da2c0',
              font: { size: 11 },
              padding: 12,
              usePointStyle: true,
              pointStyleWidth: 8,
            },
          },
          tooltip: {
            callbacks: {
              title: (items) => {
                const idx = items[0]?.dataIndex ?? 0;
                return `Date: ${trend[idx]?.date || ''} (Click to filter)`;
              },
              label: (ctx) => `${ctx.dataset.label}: ${fmtUsdFull(ctx.parsed.y ?? 0)}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#6b7fa0', font: { size: 10 } },
            border: { display: false },
          },
          y: {
            grid: { color: 'rgba(99, 120, 170, 0.08)' },
            ticks: {
              color: '#6b7fa0',
              font: { size: 10 },
              callback: (v) => fmtUsdShort(Number(v)),
            },
            border: { display: false },
          },
        },
      },
    };
  }, [trend, filters.date, filters.month]);

  return (
    <div className="card animate-in stagger-3" style={{ height: '100%' }}>
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span className="card-title">Daily Inflows vs Outflows</span>
          <span className="card-subtitle" style={{ display: 'block' }}>
            Daily cash flow volatility and net operational variance (Click bar to cross-filter)
          </span>
        </div>
        {filters.date && (
          <button
            className="filter-reset-btn"
            onClick={() => toggleFilter('date', filters.date!)}
            title="Clear date filter"
            style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4 }}
          >
            {filters.date} ✕
          </button>
        )}
      </div>
      <div className="card-body">
        <div className="chart-box" style={{ height: 260, cursor: 'pointer' }}>
          <ChartBox
            config={chartConfig}
            onElementClick={(info) => {
              const clickedDate = trend[info.index]?.date;
              if (clickedDate) {
                toggleFilter('date', clickedDate);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};
