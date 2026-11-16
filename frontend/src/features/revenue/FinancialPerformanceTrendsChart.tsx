import { useMemo } from 'react';
import type { ChartConfiguration, TooltipItem } from 'chart.js';
import ChartBox, { type ChartClickInfo } from '../../components/charts/ChartBox';
import { fmt_usd } from '../../lib/api';
import type { PerformanceTrendItem } from './useRevenue';
import { useCrossFilter } from '../../lib/CrossFilterContext';
import { dimColor } from '../../lib/crossFilterUtils';

interface FinancialPerformanceTrendsChartProps {
  trends: PerformanceTrendItem[];
}

export const FinancialPerformanceTrendsChart = ({
  trends,
}: FinancialPerformanceTrendsChartProps) => {
  const { filters, toggleFilter } = useCrossFilter();

  const labels = useMemo(() => trends.map((t) => t.month), [trends]);

  const chartConfig = useMemo<ChartConfiguration<'bar' | 'line'>>(() => {
    const revenue = trends.map((t) => t.gross_revenue);
    const opex = trends.map((t) => t.operating_expenses);
    const opIncome = trends.map((t) => t.operating_income);
    const isMonthFiltered = !!filters.month;

    const revColors = labels.map((m) => {
      const isSelected = m === filters.month;
      return isMonthFiltered && !isSelected
        ? dimColor('rgba(59, 130, 246, 0.85)', 0.22)
        : 'rgba(59, 130, 246, 0.85)';
    });

    const opexColors = labels.map((m) => {
      const isSelected = m === filters.month;
      return isMonthFiltered && !isSelected
        ? dimColor('rgba(244, 63, 94, 0.8)', 0.22)
        : 'rgba(244, 63, 94, 0.8)';
    });

    return {
      type: 'bar',
      data: {
        labels: labels.map((m) => (m === filters.month ? `▶ ${m}` : m)),
        datasets: [
          {
            type: 'bar',
            label: 'Gross Revenue',
            data: revenue,
            backgroundColor: revColors,
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
            backgroundColor: opexColors,
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
            borderColor: isMonthFiltered ? 'rgba(16, 185, 129, 0.7)' : '#10b981',
            backgroundColor: '#10b981',
            borderWidth: 2.5,
            pointBackgroundColor: '#10b981',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: (ctx) => {
              const label = labels[ctx.dataIndex];
              return label === filters.month ? 8 : 4;
            },
            pointHoverRadius: 7,
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
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleColor: '#f8fafc',
            bodyColor: '#cbd5e1',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            padding: 12,
            boxPadding: 6,
            usePointStyle: true,
            callbacks: {
              label: (ctx: TooltipItem<'bar' | 'line'>) => {
                const label = ctx.dataset.label || '';
                const val = fmt_usd(ctx.parsed.y);
                return ` ${label}: ${val}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: (ctx) => {
                const label = labels[ctx.index];
                return label === filters.month ? '#60a5fa' : '#94a3b8';
              },
              font: { size: 11, weight: 600 },
            },
            border: { display: false },
          },
          y: {
            grid: {
              color: 'rgba(148, 163, 184, 0.08)',
            },
            ticks: {
              color: '#94a3b8',
              font: { size: 10.5 },
              callback: (v: number | string) => {
                const val = typeof v === 'number' ? v : parseFloat(v);
                if (Math.abs(val) >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
                return `$${Math.round(val / 1000)}k`;
              },
            },
            border: { display: false },
          },
        },
      },
    };
  }, [labels, trends, filters.month]);

  const handleElementClick = (info: ChartClickInfo) => {
    if (info && labels[info.index]) {
      toggleFilter('month', labels[info.index]);
    }
  };

  return (
    <div className="card animate-in stagger-1">
      <div
        className="card-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <span className="card-title">Consolidated Financial Performance Trends</span>
          <span className="card-subtitle" style={{ display: 'block' }}>
            Monthly Gross Revenue vs Operating Expenses &amp; EBIT Margin
          </span>
        </div>
        <span
          style={{
            fontSize: 10,
            color: 'var(--text-muted)',
            border: '1px dashed var(--border-color)',
            padding: '2px 6px',
            borderRadius: 4,
          }}
        >
          Click bar to filter month
        </span>
      </div>

      <div className="card-body" style={{ height: 320 }}>
        <ChartBox config={chartConfig} onElementClick={handleElementClick} />
      </div>
    </div>
  );
};
