import { useEffect, useRef } from 'react';
import { Chart, type ChartConfiguration } from 'chart.js';

// Thin React wrapper around Chart.js. The classic dashboard obtained a
// canvas, built a Chart, and destroyed it on tab switch; React's effect
// cleanup plays the same role so charts never leak or double-bind.
interface Props {
  config: ChartConfiguration;
}

export default function ChartBox({ config }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  // (Re)create on every config change; destroy on unmount.
  useEffect(() => {
    if (!canvasRef.current) return;
    const chart = new Chart(canvasRef.current, config);
    chartRef.current = chart;
    return () => {
      chart.destroy();
      chartRef.current = null;
    };
  }, [config]);

  return (
    <div className="chart-box">
      <canvas ref={canvasRef} />
    </div>
  );
}