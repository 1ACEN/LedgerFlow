import { useMemo } from 'react';
import type { ChartConfiguration, TooltipItem } from 'chart.js';
import ChartBox from '../../components/charts/ChartBox';
import { fmt_usd } from '../../lib/api';
import type { PerformanceTrendItem } from './useRevenue';

interface FinancialPerformanceTrendsChartProps {
  trends: PerformanceTrendItem[];
}

export const FinancialPerformanceTrendsChart = ({
  trends,
}: FinancialPerformanceTrendsChartProps) => {
  const chartConfig = useMemo<ChartConfiguration<'bar' | 'line'>>(() => {
    const labels = trends.map((t) => t.month);
    const revenue = trends.map((t) => t.gross_revenue);
    const opex = trends.map((t) => t.operating_expenses);
    const opIncome = trends.map((t) => t.operating_income);

    return {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            type: 'bar',
            label: 'Gross Revenue',
            data: revenue,
            backgroundColor: 'rgba(59, 130, 246, 0.85)',
            hoverBackgroundColor: '#3b82f6',
            borderRadius: 5,
            borderSkipped: false,
            barPercentage: 0.65,
            categoryPercentage: 0.75,
            order: 2,
          },
          {
            type: 'bar',
            label: 'Operating Expenses',
            data: opex,
            backgroundColor: 'rgba(244, 63, 94, 0.8)',
            hoverBackgroundColor: '#f43f5e',
            borderRadius: 5,
            borderSkipped: false,
            barPercentage: 0.65,
            categoryPercentage: 0.75,
            order: 3,
          },
          {
            type: 'line',
            label: 'Operating Income (EBIT)',
            data: opIncome,
            borderColor: '#10b981',
            backgroundColor: '#10b981',
            borderWidth: 2.5,
            pointBackgroundColor: '#10b981',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.3,
            order: 1,
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
              color: '#94a3b8',
              font: { size: 11, family: "'Inter', sans-serif" },
              padding: 12,
              usePointStyle: true,
              pointStyleWidth: 8,
            },
          },
          tooltip: {
            callbacks: {
              title: (items) => {
                const idx = items[0]?.dataIndex ?? 0;
                return `Month: ${labels[idx] || ''}`;
              },
              label: (ctx: TooltipItem<'bar' | 'line'>) => {
                const val = ctx.parsed.y ?? 0;
                const idx = ctx.dataIndex;
                const item = trends[idx];
                if (ctx.dataset.label?.includes('Operating Income') && item) {
                  return ` Operating Income: ${fmt_usd(val)} (${item.operating_margin_pct}% margin)`;
                }
                return ` ${ctx.dataset.label}: ${fmt_usd(val)}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: '#94a3b8',
              font: { size: 10, family: "'JetBrains Mono', monospace" },
            },
            border: { display: false },
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: {
              color: '#94a3b8',
              font: { size: 10, family: "'JetBrains Mono', monospace" },
              callback: (v) => {
                const n = Number(v);
                if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
                if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
                return `$${n}`;
              },
            },
            border: { display: false },
          },
        },
      },
    };
  }, [trends]);

  return (
    <div className="card animate-in stagger-2" style={{ height: '100%' }}>
      <div className="card-header">
        <div>
          <span className="card-title">Financial Performance Trends &amp; Operating Leverage</span>
          <span className="card-subtitle" style={{ display: 'block' }}>
            12-month trajectory of gross invoiced volume, functional OpEx, and operating income margin
          </span>
        </div>
      </div>
      <div className="card-body">
        <div className="chart-box" style={{ height: 320 }}>
          <ChartBox config={chartConfig} />
        </div>
      </div>
    </div>
  );
};

