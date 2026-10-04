import { useMemo } from 'react';
import type { ChartConfiguration, TooltipItem } from 'chart.js';
import ChartBox from '../../components/charts/ChartBox';
import { fmt_usd } from '../../lib/api';
import type { ForecastPoint } from './useCashflow';

interface Props {
  forecast: ForecastPoint[];
}

export default function ForecastFanChart({ forecast }: Props) {
  const hasData = Array.isArray(forecast) && forecast.length > 0;

  const config = useMemo<ChartConfiguration>(() => {
    if (!hasData) {
      return {
        type: 'line',
        data: { labels: [], datasets: [] },
        options: { responsive: true, maintainAspectRatio: false },
      };
    }

    return {
      type: 'line',
      data: {
        labels: forecast.map((x) => (x.date ? String(x.date).slice(5) : '')),
        datasets: [
          {
            label: 'P90 Optimistic',
            data: forecast.map((x) => x.p90),
            borderColor: 'rgba(59,130,246,0.85)',
            borderDash: [6, 4],
            borderWidth: 1.8,
            pointRadius: 0,
            pointHoverRadius: 5,
            fill: false,
          },
          {
            label: 'P10 Conservative',
            data: forecast.map((x) => x.p10),
            borderColor: 'rgba(239,68,68,0.85)',
            borderDash: [6, 4],
            borderWidth: 1.8,
            pointRadius: 0,
            pointHoverRadius: 5,
            // Fill to dataset 0 (P90) to create the shaded confidence fan
            fill: 0,
            backgroundColor: 'rgba(59,130,246,0.08)',
          },
          {
            label: 'P50 Expected',
            data: forecast.map((x) => x.p50),
            borderColor: '#10b981',
            fill: false,
            borderWidth: 2.6,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: '#10b981',
            pointHoverBorderColor: '#fff',
            pointHoverBorderWidth: 2,
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
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
              label: (ctx: TooltipItem<'line'>) =>
                ` ${ctx.dataset.label}: ${fmt_usd(ctx.parsed.y)}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: '#6b7fa0',
              font: { size: 10 },
              autoSkip: true,
              maxTicksLimit: 14,
              maxRotation: 0,
            },
            border: { display: false },
          },
          y: {
            beginAtZero: false,
            grace: '5%',
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
  }, [forecast, hasData]);

  return (
    <div className="card animate-in stagger-2" style={{ marginBottom: '22px' }}>
      <div className="card-header">
        <div className="card-icon purple"></div>
        <span className="card-title">
          13-Week ML Cash Flow Forecast (Quantile Regression Fan Chart)
        </span>
        <span className="card-subtitle">
          P10 Conservative · P50 Expected · P90 Optimistic
        </span>
      </div>
      <div className="card-body">
        {hasData ? (
          <ChartBox config={config} />
        ) : (
          <div className="empty-state" style={{ padding: '36px 16px' }}>
            <div className="empty-state-title">No Forecast Data Available</div>
            <div className="empty-state-desc">
              ML cash flow predictions have not been generated yet.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
