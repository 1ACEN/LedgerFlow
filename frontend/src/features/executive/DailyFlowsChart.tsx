import React, { useMemo } from 'react';
import type { ChartConfiguration } from 'chart.js';
import ChartBox from '../../components/charts/ChartBox';
import type { CashTrendPoint } from './useExecutive';

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
  const chartConfig = useMemo<ChartConfiguration<'bar'>>(() => {
    const labels = trend.map(pt => pt.date.slice(5)); // 'MM-DD'
    const inflows = trend.map(pt => pt.inflows);
    const outflows = trend.map(pt => pt.outflows);

    return {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Inflows',
            data: inflows,
            backgroundColor: 'rgba(59, 130, 246, 0.75)',
            hoverBackgroundColor: 'rgba(59, 130, 246, 0.95)',
            borderRadius: 4,
            borderSkipped: false,
            barPercentage: 0.7,
          },
          {
            label: 'Outflows',
            data: outflows,
            backgroundColor: 'rgba(239, 68, 68, 0.65)',
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
                return `Date: ${trend[idx]?.date || ''}`;
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
  }, [trend]);

  return (
    <div className="card animate-in stagger-4">
      <div className="card-header">
        <div className="card-icon green">📊</div>
        <div>
          <span className="card-title">Daily Inflows vs Outflows</span>
          <span className="card-subtitle" style={{ display: 'block' }}>
            Daily cash flow volatility and net operational variance
          </span>
        </div>
      </div>
      <div className="card-body">
        <div className="chart-box">
          <ChartBox config={chartConfig} />
        </div>
      </div>
    </div>
  );
};
