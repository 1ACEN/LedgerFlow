import { useMemo } from 'react';
import type { ChartConfiguration, TooltipItem } from 'chart.js';
import ChartBox from '../../components/charts/ChartBox';
import { fmt_usd } from '../../lib/api';
import type { WeeklyFlow } from './useCashflow';

interface Props {
  weekly: WeeklyFlow[];
}

export default function WeeklyFlowChart({ weekly }: Props) {
  const config = useMemo<ChartConfiguration>(() => {
    return {
      type: 'bar',
      data: {
        labels: weekly.map((x) => x.week),
        datasets: [
          {
            label: 'Net Flow (USD)',
            data: weekly.map((x) => x.net),
            backgroundColor: weekly.map((x) =>
              x.net >= 0 ? 'rgba(16,185,129,0.75)' : 'rgba(239,68,68,0.75)'
            ),
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
              label: (ctx: TooltipItem<'bar'>) => ` Net: ${fmt_usd(ctx.parsed.y)}`,
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
                return '$' + (num / 1000).toFixed(0) + 'k';
              },
            },
            border: { display: false },
          },
        },
      },
    };
  }, [weekly]);

  return (
    <div className="card animate-in stagger-3">
      <div className="card-header">
        <div className="card-icon blue">📅</div>
        <span className="card-title">Weekly Net Cash Flow Trends</span>
        <span className="card-subtitle">operating net cash per week</span>
      </div>
      <div className="card-body">
        <ChartBox config={config} />
      </div>
    </div>
  );
}
