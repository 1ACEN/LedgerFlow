import { useMemo } from 'react';
import type { ChartConfiguration, TooltipItem } from 'chart.js';
import ChartBox from '../../components/charts/ChartBox';
import { fmt_usd } from '../../lib/api';
import type { WeeklyFlow } from './useCashflow';
import { useCrossFilter } from '../../lib/CrossFilterContext';
import { dimColor } from '../../lib/crossFilterUtils';

interface Props {
  weekly: WeeklyFlow[];
}

export default function WeeklyFlowChart({ weekly }: Props) {
  const { filters, toggleFilter } = useCrossFilter();
  const hasData = Array.isArray(weekly) && weekly.length > 0;

  const config = useMemo<ChartConfiguration>(() => {
    if (!hasData) {
      return {
        type: 'bar',
        data: { labels: [], datasets: [] },
        options: { responsive: true, maintainAspectRatio: false },
      };
    }

    const isFiltered = !!filters.month;
    const bgColors = weekly.map((x) => {
      const isSelected = x.week.startsWith(filters.month || '');
      const baseColor = x.net >= 0 ? 'rgba(16,185,129,0.85)' : 'rgba(239,68,68,0.85)';
      if (isFiltered) {
        return isSelected ? baseColor : dimColor(baseColor, 0.22);
      }
      return baseColor;
    });

    return {
      type: 'bar',
      data: {
        labels: weekly.map((x) => {
          const isSelected = filters.month && x.week.startsWith(filters.month);
          return isSelected ? `▶ ${x.week}` : x.week;
        }),
        datasets: [
          {
            label: 'Net Flow (USD)',
            data: weekly.map((x) => x.net),
            backgroundColor: bgColors,
            borderRadius: 5,
            borderSkipped: false,
            barPercentage: 0.6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx: TooltipItem<'bar'>) => ` Net: ${fmt_usd(ctx.parsed.y)} (Click to filter)`,
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
            grid: { color: 'rgba(99,120,170,0.08)' },
            ticks: {
              color: '#6b7fa0',
              font: { size: 10 },
              callback: (v: number | string) => {
                const num = typeof v === 'number' ? v : parseFloat(v);
                if (isNaN(num)) return '$0';
                if (Math.abs(num) >= 1_000_000) {
                  return '$' + (num / 1_000_000).toFixed(2) + 'M';
                }
                return '$' + (num / 1000).toFixed(0) + 'k';
              },
            },
            border: { display: false },
          },
        },
      },
    };
  }, [weekly, hasData, filters.month]);

  return (
    <div className="card animate-in stagger-3" style={{ height: '100%' }}>
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span className="card-title">Weekly Net Cash Flow Distribution</span>
          <span className="card-subtitle" style={{ display: 'block' }}>
            Operating net flow surplus &amp; deficit deltas across rolling 12 weeks (Click week to filter month)
          </span>
        </div>
        {filters.month && (
          <button
            className="filter-reset-btn"
            onClick={() => toggleFilter('month', filters.month!)}
            style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4 }}
          >
            {filters.month} ✕
          </button>
        )}
      </div>
      <div className="card-body">
        <div className="chart-box" style={{ height: 320, cursor: 'pointer' }}>
          <ChartBox
            config={config}
            onElementClick={(info) => {
              const clickedWeek = weekly[info.index]?.week;
              if (clickedWeek) {
                const month = clickedWeek.slice(0, 7);
                toggleFilter('month', month);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
