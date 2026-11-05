import { useMemo, useState } from 'react';
import type { ChartConfiguration, TooltipItem } from 'chart.js';
import ChartBox from '../../components/charts/ChartBox';
import { fmt_usd } from '../../lib/api';
import type { ForecastPoint, ActualHistoryPoint } from './useCashflow';

interface ActualVsForecastChartProps {
  actualHistory: ActualHistoryPoint[];
  forecast: ForecastPoint[];
}

type ScenarioFilter = 'all' | 'p50' | 'p90' | 'p10';

export const ActualVsForecastChart = ({
  actualHistory,
  forecast,
}: ActualVsForecastChartProps) => {
  const [selectedScenario, setSelectedScenario] = useState<ScenarioFilter>('all');

  const chartConfig = useMemo<ChartConfiguration<'line'>>(() => {
    // Combine labels: actual dates followed by forecast dates
    const actualLabels = actualHistory.map((a) => a.date.slice(5)); // 'MM-DD'
    const forecastLabels = forecast.map((f) => f.date.slice(5)); // 'MM-DD'
    const allLabels = [...actualLabels, ...forecastLabels];

    // Actual dataset: values for actual dates, null for forecast dates
    // Connect the last actual point to the start of forecast
    const lastActual = actualHistory.length > 0 ? actualHistory[actualHistory.length - 1].cash : null;
    const actualSeries: (number | null)[] = [
      ...actualHistory.map((a) => a.cash),
      ...forecast.map(() => null),
    ];

    // Forecast series: null for actual dates (except the last actual point for continuity), then forecast points
    const p10Series: (number | null)[] = [
      ...actualHistory.slice(0, -1).map(() => null),
      lastActual,
      ...forecast.map((f) => f.p10),
    ];

    const p50Series: (number | null)[] = [
      ...actualHistory.slice(0, -1).map(() => null),
      lastActual,
      ...forecast.map((f) => f.p50),
    ];

    const p90Series: (number | null)[] = [
      ...actualHistory.slice(0, -1).map(() => null),
      lastActual,
      ...forecast.map((f) => f.p90),
    ];

    const datasets: ChartConfiguration<'line'>['data']['datasets'] = [
      {
        label: 'Actual Recorded Cash',
        data: actualSeries,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 2.8,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: '#10b981',
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 2,
        tension: 0.25,
      },
    ];

    if (selectedScenario === 'all' || selectedScenario === 'p90') {
      datasets.push({
        label: 'Best-Case (P90 Optimistic)',
        data: p90Series,
        borderColor: 'rgba(59, 130, 246, 0.9)',
        borderDash: [5, 4],
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 5,
        fill: false,
        tension: 0.25,
      });
    }

    if (selectedScenario === 'all' || selectedScenario === 'p10') {
      datasets.push({
        label: 'Worst-Case (P10 Conservative)',
        data: p10Series,
        borderColor: 'rgba(244, 63, 94, 0.9)',
        borderDash: [5, 4],
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 5,
        fill: selectedScenario === 'all' ? '-1' : false, // Fill between P90 and P10
        backgroundColor: 'rgba(59, 130, 246, 0.08)',
        tension: 0.25,
      });
    }

    if (selectedScenario === 'all' || selectedScenario === 'p50') {
      datasets.push({
        label: 'Base-Case (P50 Expected)',
        data: p50Series,
        borderColor: '#38bdf8',
        borderWidth: 2.5,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: '#38bdf8',
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 2,
        fill: false,
        tension: 0.25,
      });
    }

    return {
      type: 'line',
      data: {
        labels: allLabels,
        datasets,
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
                const isActual = idx < actualHistory.length;
                const dateStr = allLabels[idx] || '';
                return `${isActual ? 'Recorded Actual' : 'ML Forecast'} · Date: ${dateStr}`;
              },
              label: (ctx: TooltipItem<'line'>) => {
                const val = ctx.parsed.y;
                if (val === null || val === undefined) return '';
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
              autoSkip: true,
              maxTicksLimit: 14,
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
                if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
                if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
                return `$${n}`;
              },
            },
            border: { display: false },
          },
        },
      },
    };
  }, [actualHistory, forecast, selectedScenario]);

  return (
    <div className="card animate-in stagger-2" style={{ height: '100%' }}>
      <div
        className="card-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <span className="card-title">Actual vs. Forecast Cash Flow Trajectory</span>
          <span className="card-subtitle" style={{ display: 'block' }}>
            30-day recorded historical balances aligned with 90-day quantile forward simulation
          </span>
        </div>

        {/* Interactive Scenario Filter Buttons */}
        <div className="filter-group">
          <button
            className={`filter-btn ${selectedScenario === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedScenario('all')}
            style={{ fontSize: 11, padding: '3px 9px' }}
          >
            All Scenarios
          </button>
          <button
            className={`filter-btn ${selectedScenario === 'p50' ? 'active' : ''}`}
            onClick={() => setSelectedScenario('p50')}
            style={{ fontSize: 11, padding: '3px 9px' }}
          >
            Base (P50)
          </button>
          <button
            className={`filter-btn ${selectedScenario === 'p90' ? 'active' : ''}`}
            onClick={() => setSelectedScenario('p90')}
            style={{ fontSize: 11, padding: '3px 9px' }}
          >
            Best (P90)
          </button>
          <button
            className={`filter-btn ${selectedScenario === 'p10' ? 'active' : ''}`}
            onClick={() => setSelectedScenario('p10')}
            style={{ fontSize: 11, padding: '3px 9px' }}
          >
            Worst (P10)
          </button>
        </div>
      </div>

      <div className="card-body">
        <div className="chart-box" style={{ height: 350 }}>
          <ChartBox config={chartConfig} />
        </div>
      </div>
    </div>
  );
};
