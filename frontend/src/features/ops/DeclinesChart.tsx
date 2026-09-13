import React, { useMemo } from 'react';
import type { ChartConfiguration } from 'chart.js';
import ChartBox from '../../components/charts/ChartBox';
import type { DeclineItem } from './useOps';

interface DeclinesChartProps {
  declines: DeclineItem[];
}

export const DeclinesChart: React.FC<DeclinesChartProps> = ({ declines }) => {
  const chartConfig = useMemo<ChartConfiguration<'bar'>>(() => {
    const labels = declines.map(d => d.code.replace(/_/g, ' '));
    const counts = declines.map(d => d.count);

    return {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Total Declines',
            data: counts,
            backgroundColor: 'rgba(239, 68, 68, 0.75)',
            hoverBackgroundColor: 'rgba(239, 68, 68, 0.95)',
            borderRadius: 5,
            borderSkipped: false,
            barPercentage: 0.65,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.parsed.x ?? 0} declines`,
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
            grid: { display: false },
            ticks: {
              color: '#8da2c0',
              font: { size: 11, family: "'JetBrains Mono', monospace" },
            },
            border: { display: false },
          },
        },
      },
    };
  }, [declines]);

  return (
    <div className="card animate-in stagger-1">
      <div className="card-header">
        <div className="card-icon yellow">📉</div>
        <div>
          <span className="card-title">Top Payment Decline Reasons</span>
          <span className="card-subtitle" style={{ display: 'block' }}>
            Root-cause frequency distribution across failed attempts
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
