import React, { useMemo } from 'react';
import type { ChartConfiguration, TooltipItem } from 'chart.js';
import ChartBox from '../../components/charts/ChartBox';
import type { MonthlyComparisonPoint } from './useExecutive';

interface RevenueVsExpensesChartProps {
  data: MonthlyComparisonPoint[];
}

function fmtCurrency(v: number): string {
  if (Math.abs(v) >= 1_000_000) {
    return `$${(v / 1_000_000).toFixed(2)}M`;
  }
  if (Math.abs(v) >= 1_000) {
    return `$${(v / 1_000).toFixed(0)}k`;
  }
  return `$${v.toFixed(0)}`;
}

function fmtFull(v: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(v);
}

export const RevenueVsExpensesChart: React.FC<RevenueVsExpensesChartProps> = ({ data }) => {
  const chartConfig = useMemo<ChartConfiguration<'bar' | 'line'>>(() => {
    const labels = data.map((d) => d.month);
    const revenue = data.map((d) => d.revenue);
    const expenses = data.map((d) => d.expenses);
    const profit = data.map((d) => d.net_profit);

    return {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            type: 'bar',
            label: 'Total Revenue',
            data: revenue,
            backgroundColor: 'rgba(59, 130, 246, 0.85)',
            hoverBackgroundColor: '#3b82f6',
            borderRadius: 6,
            borderSkipped: false,
            barPercentage: 0.65,
            categoryPercentage: 0.75,
            order: 2,
          },
          {
            type: 'bar',
            label: 'Total Expenses',
            data: expenses,
            backgroundColor: 'rgba(244, 63, 94, 0.8)',
            hoverBackgroundColor: '#f43f5e',
            borderRadius: 6,
            borderSkipped: false,
            barPercentage: 0.65,
            categoryPercentage: 0.75,
            order: 3,
          },
          {
            type: 'line',
            label: 'Net Profit',
            data: profit,
            borderColor: '#10b981',
            backgroundColor: '#10b981',
            borderWidth: 2.5,
            pointBackgroundColor: '#10b981',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.35,
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
              padding: 14,
              usePointStyle: true,
              pointStyleWidth: 8,
            },
          },
          tooltip: {
            callbacks: {
              title: (items) => {
                const idx = items[0]?.dataIndex ?? 0;
                return `Month: ${data[idx]?.month || ''}`;
              },
              label: (ctx: TooltipItem<'bar' | 'line'>) => {
                const val = ctx.parsed.y ?? 0;
                const idx = ctx.dataIndex;
                const item = data[idx];
                if (ctx.dataset.label === 'Net Profit' && item) {
                  return ` Net Profit: ${fmtFull(val)} (${item.margin_pct}% margin)`;
                }
                return ` ${ctx.dataset.label}: ${fmtFull(val)}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: '#94a3b8',
              font: { size: 11, family: "'JetBrains Mono', monospace" },
            },
            border: { display: false },
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: {
              color: '#94a3b8',
              font: { size: 10, family: "'JetBrains Mono', monospace" },
              callback: (v) => fmtCurrency(Number(v)),
            },
            border: { display: false },
          },
        },
      },
    };
  }, [data]);

  return (
    <div className="card animate-in stagger-2" style={{ height: '100%' }}>
      <div className="card-header">
        <div>
          <span className="card-title">Revenue vs. Expenses Comparison</span>
          <span className="card-subtitle" style={{ display: 'block' }}>
            6-month trajectory of gross income vs operating outflows &amp; net profitability
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

