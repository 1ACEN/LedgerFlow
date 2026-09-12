import { useMemo } from 'react';
import type { ChartConfiguration, TooltipItem } from 'chart.js';
import ChartBox from '../../components/charts/ChartBox';
import { fmt_usd } from '../../lib/api';
import { formatProductLine, type RevenueRow } from './useRevenue';

interface Props {
  rows: RevenueRow[];
}

const PRODUCT_COLORS = [
  'rgba(59,130,246,0.85)',  // subscriptions (blue)
  'rgba(16,185,129,0.85)',  // services (green)
  'rgba(245,158,11,0.85)',  // marketplace (yellow)
  'rgba(139,92,246,0.85)',  // ecommerce (purple)
  'rgba(6,182,212,0.85)',   // platform fees (cyan)
  'rgba(249,115,22,0.85)',  // extra (orange)
];

export default function RevenueProductBars({ rows }: Props) {
  const config = useMemo<ChartConfiguration>(() => {
    const monthSet = new Set<string>();
    const prodSet = new Set<string>();
    for (const r of rows) {
      monthSet.add(r.month);
      prodSet.add(r.product_line);
    }
    const months = Array.from(monthSet).sort();
    const products = Array.from(prodSet).sort();

    const datasets = products.map((prod, i) => {
      const data = months.map((m) => {
        const match = rows.find((r) => r.month === m && r.product_line === prod);
        return match ? match.revenue : 0;
      });
      return {
        label: formatProductLine(prod),
        data,
        backgroundColor: PRODUCT_COLORS[i % PRODUCT_COLORS.length],
        borderRadius: 4,
        borderSkipped: false,
        stack: 'total',
      };
    });

    return {
      type: 'bar',
      data: {
        labels: months.map((m) => m.slice(0, 7)),
        datasets,
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
              label: (ctx: TooltipItem<'bar'>) =>
                ` ${ctx.dataset.label}: ${fmt_usd(ctx.parsed.y)}`,
            },
          },
        },
        scales: {
          x: {
            stacked: true,
            grid: { display: false },
            ticks: { color: '#6b7fa0', font: { size: 10 } },
            border: { display: false },
          },
          y: {
            stacked: true,
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
  }, [rows]);

  return (
    <div className="card animate-in stagger-2">
      <div className="card-header">
        <div className="card-icon blue">📊</div>
        <span className="card-title">Monthly Revenue by Product Line</span>
        <span className="card-subtitle">stacked gross revenue across lines</span>
      </div>
      <div className="card-body">
        <ChartBox config={config} />
      </div>
    </div>
  );
}
