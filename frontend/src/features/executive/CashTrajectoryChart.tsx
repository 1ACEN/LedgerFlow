import React, { useMemo } from 'react';
import type { ChartConfiguration } from 'chart.js';
import ChartBox from '../../components/charts/ChartBox';
import type { CashTrendPoint } from './useExecutive';

interface CashTrajectoryChartProps {
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

export const CashTrajectoryChart: React.FC<CashTrajectoryChartProps> = ({ trend }) => {
  const chartConfig = useMemo<ChartConfiguration<'line'>>(() => {
    const labels = trend.map(pt => pt.date.slice(5)); // 'MM-DD'
    const cashData = trend.map(pt => pt.cash);

    return {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Cumulative Cash (USD)',
            data: cashData,
            borderColor: '#10b981',
            backgroundColor: (context) => {
              const chart = context.chart;
              const { ctx, chartArea } = chart;
              if (!chartArea) return 'rgba(16, 185, 129, 0.12)';
              const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
              gradient.addColorStop(0, 'rgba(16, 185, 129, 0.22)');
              gradient.addColorStop(1, 'rgba(16, 185, 129, 0.01)');
              return gradient;
            },
            fill: true,
            tension: 0.35,
            borderWidth: 2.5,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: '#10b981',
            pointHoverBorderColor: '#ffffff',
            pointHoverBorderWidth: 2,
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
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (items) => {
                const idx = items[0]?.dataIndex ?? 0;
                return `Date: ${trend[idx]?.date || ''}`;
              },
              label: (ctx) => `Cumulative Cash: ${fmtUsdFull(ctx.parsed.y ?? 0)}`,
            },
          },
        },
        scales: {
          x: {
            grid: { color: 'rgba(99, 120, 170, 0.08)' },
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
    <div className="card animate-in stagger-3">
      <div className="card-header">
        <div className="card-icon blue">📈</div>
        <div>
          <span className="card-title">30-Day Cumulative Cash Trajectory</span>
          <span className="card-subtitle" style={{ display: 'block' }}>
            Daily liquidity balance across operating & treasury reserves
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
