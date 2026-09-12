import { useMemo } from 'react';
import type { ChartConfiguration, TooltipItem } from 'chart.js';
import ChartBox from '../../components/charts/ChartBox';
import { fmt_usd } from '../../lib/api';
import { computeMoMGrowth, type RevenueRow } from './useRevenue';

interface Props {
  rows: RevenueRow[];
}

export default function RevenueGrowthCombo({ rows }: Props) {
  const config = useMemo<ChartConfiguration>(() => {
    const { months, totals, momGrowth } = computeMoMGrowth(rows);

    const validGrowth = momGrowth.filter((v): v is number => v !== null && !isNaN(v));
    const minGrowth = validGrowth.length ? Math.min(...validGrowth) - 5 : -10;
    const maxGrowth = validGrowth.length ? Math.max(...validGrowth) + 5 : 20;

    return {
      type: 'bar' as const,
      data: {
        labels: months.map((m) => m.slice(0, 7)),
        datasets: [
          {
            type: 'bar',
            label: 'Gross Revenue',
            data: totals,
            backgroundColor: 'rgba(59,130,246,0.65)',
            borderRadius: 5,
            borderSkipped: false,
            yAxisID: 'y',
            order: 2,
          },
          {
            type: 'line',
            label: 'MoM Growth %',
            data: momGrowth as number[],
            borderColor: '#10b981',
            backgroundColor: 'rgba(16,185,129,0.15)',
            borderWidth: 2.5,
            pointBackgroundColor: '#10b981',
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.3,
            yAxisID: 'yG',
            order: 1,
          },
        ],
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
              label: (ctx: TooltipItem<'bar' | 'line'>) => {
                if (ctx.dataset.type === 'line') {
                  return ` ${ctx.dataset.label}: ${ctx.parsed.y != null ? ctx.parsed.y + '%' : '—'}`;
                }
                return ` ${ctx.dataset.label}: ${fmt_usd(ctx.parsed.y)}`;
              },
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
            position: 'left',
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
          yG: {
            position: 'right',
            grid: { drawOnChartArea: false },
            ticks: {
              color: '#10b981',
              font: { size: 10 },
              callback: (v: number | string) => `${v}%`,
            },
            border: { display: false },
            min: minGrowth,
            max: maxGrowth,
          },
        },
      },
    };
  }, [rows]);

  return (
    <div className="card animate-in stagger-3">
      <div className="card-header">
        <div className="card-icon green">📈</div>
        <span className="card-title">Revenue &amp; MoM Growth Rate</span>
        <span className="card-subtitle">revenue (left) vs growth % (right)</span>
      </div>
      <div className="card-body">
        <ChartBox config={config} />
      </div>
    </div>
  );
}
