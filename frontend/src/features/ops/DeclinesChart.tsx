import React, { useMemo } from 'react';
import type { ChartConfiguration } from 'chart.js';
import ChartBox from '../../components/charts/ChartBox';
import type { DeclineItem } from './useOps';
import { useCrossFilter } from '../../lib/CrossFilterContext';
import { dimColor } from '../../lib/crossFilterUtils';

interface DeclinesChartProps {
  declines: DeclineItem[];
}

export const DeclinesChart: React.FC<DeclinesChartProps> = ({ declines }) => {
  const { filters, toggleFilter } = useCrossFilter();

  const chartConfig = useMemo<ChartConfiguration<'bar'>>(() => {
    const isFiltered = !!filters.declineCode;
    const labels = declines.map((d) => {
      const clean = d.code.replace(/_/g, ' ');
      return filters.declineCode === d.code ? `▶ ${clean}` : clean;
    });
    const counts = declines.map((d) => d.count);
    const bgColors = declines.map((d) => {
      const isSelected = filters.declineCode === d.code;
      const base = 'rgba(239, 68, 68, 0.85)';
      if (isFiltered) {
        return isSelected ? base : dimColor(base, 0.22);
      }
      return base;
    });

    return {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Total Declines',
            data: counts,
            backgroundColor: bgColors,
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
              label: (ctx) => `${ctx.parsed.x ?? 0} declines (Click to filter)`,
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
  }, [declines, filters.declineCode]);

  return (
    <div className="card animate-in stagger-1">
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span className="card-title">Top Payment Decline Reasons</span>
          <span className="card-subtitle" style={{ display: 'block' }}>
            Root-cause frequency distribution across failed attempts (Click bar to cross-filter)
          </span>
        </div>
        {filters.declineCode && (
          <button
            className="filter-reset-btn"
            onClick={() => toggleFilter('declineCode', filters.declineCode!)}
            style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4 }}
          >
            {filters.declineCode.replace(/_/g, ' ')} ✕
          </button>
        )}
      </div>
      <div className="card-body">
        <div className="chart-box" style={{ cursor: 'pointer' }}>
          <ChartBox
            config={chartConfig}
            onElementClick={(info) => {
              const code = declines[info.index]?.code;
              if (code) {
                toggleFilter('declineCode', code);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};
