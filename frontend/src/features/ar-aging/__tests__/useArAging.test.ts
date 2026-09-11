import { describe, it, expect } from 'vitest';
import { arSeverity, topOverdue, arKpis, type ArAgingRow } from '../useArAging';

function row(overrides: Partial<ArAgingRow> = {}): ArAgingRow {
  return {
    customer_id: '1',
    customer_name: 'Test Corp',
    invoices: 1,
    total: 1000,
    current: 1000,
    days_31_60: 0,
    days_61_90: 0,
    days_90_plus: 0,
    ...overrides,
  };
}

// ── arSeverity ──────────────────────────────────────────────────────

describe('arSeverity', () => {
  it('returns critical when any 90+ days exist', () => {
    expect(arSeverity(row({ days_90_plus: 1 }))).toBe('critical');
    expect(arSeverity(row({ days_90_plus: 500 }))).toBe('critical');
  });

  it('returns elevated when 61-90 > 0 but no 90+', () => {
    expect(arSeverity(row({ days_61_90: 1 }))).toBe('elevated');
    expect(arSeverity(row({ days_61_90: 10, days_90_plus: 0 }))).toBe('elevated');
  });

  it('returns moderate when 31-60 > 0 but no 61+', () => {
    expect(arSeverity(row({ days_31_60: 1 }))).toBe('moderate');
    expect(arSeverity(row({ days_31_60: 50, days_61_90: 0, days_90_plus: 0 }))).toBe('moderate');
  });

  it('returns current when all overdue buckets are zero', () => {
    expect(arSeverity(row())).toBe('current');
    expect(arSeverity(row({ days_31_60: 0, days_61_90: 0, days_90_plus: 0 }))).toBe('current');
  });

  it('critical takes priority over lower severities', () => {
    expect(arSeverity(row({ days_31_60: 10, days_61_90: 5, days_90_plus: 1 }))).toBe('critical');
  });
});

// ── topOverdue ──────────────────────────────────────────────────────

describe('topOverdue', () => {
  const overdue = [
    row({ customer_id: '1', customer_name: 'A', days_90_plus: 50 }),
    row({ customer_id: '2', customer_name: 'B', days_90_plus: 200 }),
    row({ customer_id: '3', customer_name: 'C', days_90_plus: 10 }),
  ];

  it('returns rows with days_90_plus > 0 sorted descending', () => {
    const result = topOverdue(overdue);
    expect(result).toHaveLength(3);
    expect(result[0].customer_id).toBe('2'); // 200
    expect(result[1].customer_id).toBe('1'); // 50
    expect(result[2].customer_id).toBe('3'); // 10
  });

  it('defaults to top 5', () => {
    const big = Array.from({ length: 8 }, (_, i) =>
      row({ customer_id: String(i), days_90_plus: i * 10 })
    );
    expect(topOverdue(big)).toHaveLength(5);
  });

  it('respects limit parameter', () => {
    expect(topOverdue(overdue, 2)).toHaveLength(2);
    expect(topOverdue(overdue, 1)[0].customer_id).toBe('2');
  });

  it('excludes rows with days_90_plus === 0', () => {
    const mixed = [
      row({ customer_id: '1', days_90_plus: 100 }),
      row({ customer_id: '2', days_90_plus: 0 }),
      row({ customer_id: '3', days_90_plus: 0 }),
    ];
    const result = topOverdue(mixed);
    expect(result).toHaveLength(1);
    expect(result[0].customer_id).toBe('1');
  });

  it('returns empty array when no overdue', () => {
    const current = [row({ days_90_plus: 0 }), row({ days_90_plus: 0 })];
    expect(topOverdue(current)).toEqual([]);
  });
});

// ── arKpis ──────────────────────────────────────────────────────────

describe('arKpis', () => {
  it('returns zeros for empty array', () => {
    expect(arKpis([])).toEqual({
      total: 0,
      invoices: 0,
      customers: 0,
      avgInvoice: 0,
      overduePct: 0,
    });
  });

  it('sums totals, invoices, and counts customers', () => {
    const data = [
      row({ total: 1000, invoices: 2, days_90_plus: 50 }),
      row({ total: 3000, invoices: 1, days_90_plus: 0 }),
    ];
    const k = arKpis(data);
    expect(k.total).toBe(4000);
    expect(k.invoices).toBe(3);
    expect(k.customers).toBe(2);
  });

  it('computes avg invoice from total / invoices', () => {
    const k = arKpis([row({ total: 1000, invoices: 2 })]);
    expect(k.avgInvoice).toBe(500);
  });

  it('computes overduePct as rounded percentage of total', () => {
    const k = arKpis([row({ total: 4000, invoices: 3, days_90_plus: 50 })]);
    expect(k.overduePct).toBe(1); // 50/4000 = 0.0125 → round → 1
  });

  it('rounds overduePct to nearest integer', () => {
    const k = arKpis([row({ total: 100, invoices: 1, days_90_plus: 50 })]);
    expect(k.overduePct).toBe(50); // 50/100 = 0.5 → 50
  });

  it('returns overduePct 0 when total is zero', () => {
    const k = arKpis([row({ total: 0, invoices: 0, days_90_plus: 0 })]);
    expect(k.overduePct).toBe(0);
  });
});
