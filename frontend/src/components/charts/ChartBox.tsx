import { useEffect, useRef, useMemo } from 'react';
import { Chart, type ChartConfiguration } from 'chart.js';
import { useTheme, type ChartThemeColors } from '../../lib/ThemeContext';

export interface ChartClickInfo {
  index: number;
  datasetIndex: number;
  label: string;
  value: any;
}

interface Props {
  config: ChartConfiguration;
  onElementClick?: (info: ChartClickInfo) => void;
}

function applyThemeToConfig(
  config: ChartConfiguration,
  theme: 'light' | 'dark',
  chartColors: ChartThemeColors,
  onElementClick?: (info: ChartClickInfo) => void
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

  // Datasets (adapt doughnut/pie border colors if not explicitly set)
  let datasets = config.data?.datasets;
  if (datasets && Array.isArray(datasets)) {
    datasets = datasets.map((ds) => {
      if ((config.type === 'doughnut' || config.type === 'pie') && !ds.borderColor) {
        return { ...ds, borderColor: chartColors.doughnutBorder };
      }
      return ds;
    });
  }

  // Wire interactive element click delegation for Power BI-style cross filtering
  if (onElementClick) {
    options.onClick = (_event: any, elements: any[], chart: Chart) => {
      if (elements && elements.length > 0) {
        const firstPoint = elements[0];
        const datasetIndex = firstPoint.datasetIndex;
        const index = firstPoint.index;
        const labels = chart.data.labels as string[] | undefined;
        const label = labels && labels[index] ? String(labels[index]) : '';
        const dataset = chart.data.datasets[datasetIndex];
        const value = dataset && dataset.data ? dataset.data[index] : null;

        onElementClick({
          index,
          datasetIndex,
          label,
          value,
        });
      }
    };

    options.onHover = (event: any, elements: any[]) => {
      if (event.native && event.native.target) {
        (event.native.target as HTMLElement).style.cursor =
          elements && elements.length > 0 ? 'pointer' : 'default';
      }
    };
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

export default function ChartBox({ config, onElementClick }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const { theme, chartColors } = useTheme();

  const themedConfig = useMemo(
    () => applyThemeToConfig(config, theme, chartColors, onElementClick),
    [config, theme, chartColors, onElementClick]
  );

  useEffect(() => {
    if (!canvasRef.current) return;
    const existing = Chart.getChart(canvasRef.current);

    // In-place update if chart already exists and type is unchanged (prevents canvas destroy/flicker)
    if (existing && (existing.config as any).type === (themedConfig as any).type) {
      existing.data = themedConfig.data;
      existing.options = themedConfig.options || {};
      existing.update();
      chartRef.current = existing;
      return;
    }

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
