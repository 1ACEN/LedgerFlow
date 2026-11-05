import { useEffect, useRef, useMemo } from 'react';
import { Chart, type ChartConfiguration } from 'chart.js';
import { useTheme, type ChartThemeColors } from '../../lib/ThemeContext';

interface Props {
  config: ChartConfiguration;
}

function applyThemeToConfig(
  config: ChartConfiguration,
  theme: 'light' | 'dark',
  chartColors: ChartThemeColors
): ChartConfiguration {
  const options = config.options ? { ...config.options } : {};
  const plugins = options.plugins ? { ...options.plugins } : {};

  // Legend label color
  const legend = plugins.legend ? { ...plugins.legend } : {};
  const legendLabels = legend.labels ? { ...legend.labels } : {};
  legendLabels.color = chartColors.legend;
  legend.labels = legendLabels;
  plugins.legend = legend;

  // Tooltip theme
  const tooltip = plugins.tooltip ? { ...plugins.tooltip } : {};
  tooltip.backgroundColor = chartColors.tooltipBg;
  tooltip.titleColor = chartColors.tooltipText;
  tooltip.bodyColor = chartColors.tooltipText;
  tooltip.borderColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)';
  tooltip.borderWidth = 1;
  plugins.tooltip = tooltip;

  options.plugins = plugins;

  // Scales (ticks and grid lines)
  if (options.scales) {
    const scales: Record<string, any> = { ...options.scales };
    for (const [key, scale] of Object.entries(scales)) {
      if (scale && typeof scale === 'object') {
        const clonedScale = { ...scale };
        if (clonedScale.ticks) {
          clonedScale.ticks = { ...clonedScale.ticks, color: chartColors.ticks };
        }
        if (clonedScale.grid && clonedScale.grid.display !== false) {
          clonedScale.grid = { ...clonedScale.grid, color: chartColors.grid };
        }
        scales[key] = clonedScale;
      }
    }
    options.scales = scales;
  }

  // Datasets (adapt doughnut/pie border colors)
  let datasets = config.data?.datasets;
  if (datasets && Array.isArray(datasets)) {
    datasets = datasets.map((ds) => {
      if (config.type === 'doughnut' || config.type === 'pie') {
        return { ...ds, borderColor: chartColors.doughnutBorder };
      }
      return ds;
    });
  }

  return {
    ...config,
    data: {
      ...config.data,
      datasets: datasets || [],
    },
    options,
  };
}

export default function ChartBox({ config }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const { theme, chartColors } = useTheme();

  const themedConfig = useMemo(
    () => applyThemeToConfig(config, theme, chartColors),
    [config, theme, chartColors]
  );

  // (Re)create on every config/theme change; destroy on unmount.
  useEffect(() => {
    if (!canvasRef.current) return;
    const existing = Chart.getChart(canvasRef.current);
    if (existing) {
      existing.destroy();
    }
    const chart = new Chart(canvasRef.current, themedConfig);
    chartRef.current = chart;
    return () => {
      chart.destroy();
      chartRef.current = null;
    };
  }, [themedConfig]);

  return (
    <div className="chart-box">
      <canvas ref={canvasRef} />
    </div>
  );
}
