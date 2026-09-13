import React, { useMemo } from 'react';
import type { ChartConfiguration } from 'chart.js';
import ChartBox from '../../components/charts/ChartBox';
import type { SuccessTrendPoint } from './useOps';

interface SuccessTrendChartProps {
  trend: SuccessTrendPoint[];
}

const LINE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

export const SuccessTrendChart: React.FC<SuccessTrendChartProps> = ({ trend }) => {
  const chartConfig = useMemo<ChartConfiguration<'line'>>(() => {
    const sources = [...new Set(trend.map(x => x.source))];
    const dates = [...new Set(trend.map(x => x.date))].sort();

    return {
      type: 'line',
      data: {
        labels: dates.map(dt => dt.slice(5)), // 'MM-DD'
        datasets: sources.map((s, idx) => ({
          label: s,
          data: dates.map(dt => {
            const match = trend.find(x => x.date === dt && x.source === s);
            return match ? match.rate : null;
          }),
          borderColor: LINE_COLORS[idx % LINE_COLORS.length],
          backgroundColor: LINE_COLORS[idx % LINE_COLORS.length],
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          spanGaps: true,
        })),
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
                return `Date: ${dates[idx] || ''}`;
              },
              label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y ?? 0}%`,
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
            min: 50,
            max: 100,
            grid: { color: 'rgba(99, 120, 170, 0.08)' },
            ticks: {
              color: '#6b7fa0',
              font: { size: 10 },
              callback: (v) => `${v}%`,
            },
            border: { display: false },
          },
        },
      },
    };
  }, [trend]);

  return (
    <div className="card animate-in stagger-2">
      <div className="card-header">
        <div className="card-icon cyan">🛡️</div>
        <div>
          <span className="card-title">Gateway Success Rate Trends</span>
          <span className="card-subtitle" style={{ display: 'block' }}>
            Daily settlement authorization rate tracked by payment gateway
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
