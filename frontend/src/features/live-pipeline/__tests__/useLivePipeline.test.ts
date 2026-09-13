import { describe, it, expect } from 'vitest';
import {
  computeLiveKpis,
  formatTimeAgo,
  shortId,
  LiveStatsResponse,
} from '../useLivePipeline';

describe('computeLiveKpis', () => {
  it('handles null stats safely with zeroed defaults', () => {
    const kpis = computeLiveKpis(null);
    expect(kpis.totalTransactions).toBe(0);
    expect(kpis.todayVolume).toBe(0);
    expect(kpis.todayTotalUsd).toBe(0);
    expect(kpis.liveSuccessRate).toBeNull();
    expect(kpis.lastIngested).toBeNull();
    expect(kpis.bySource).toEqual({});
  });

  it('extracts live KPI values accurately', () => {
    const mockStats: LiveStatsResponse = {
      total_transactions: 58920,
      today: {
        volume: 142,
        total_usd: 18450.75,
        success_rate: 98.6,
      },
      last_ingested: '2026-09-13T10:00:00Z',
      by_source: {
        stripe: 30000,
        plaid: 15000,
        manual: 13920,
      },
    };

    const kpis = computeLiveKpis(mockStats);
    expect(kpis.totalTransactions).toBe(58920);
    expect(kpis.todayVolume).toBe(142);
    expect(kpis.todayTotalUsd).toBe(18450.75);
    expect(kpis.liveSuccessRate).toBe(98.6);
    expect(kpis.lastIngested).toBe('2026-09-13T10:00:00Z');
    expect(kpis.bySource.stripe).toBe(30000);
  });
});

describe('formatTimeAgo', () => {
  it('returns appropriate string for null or invalid', () => {
    expect(formatTimeAgo(null)).toBe('no events yet');
    expect(formatTimeAgo('not-a-date')).toBe('—');
  });

  it('formats recent timestamps gracefully', () => {
    const now = new Date();
    expect(formatTimeAgo(now.toISOString())).toBe('just now');

    const tenSecAgo = new Date(Date.now() - 15 * 1000);
    expect(formatTimeAgo(tenSecAgo.toISOString())).toContain('s ago');

    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    expect(formatTimeAgo(fiveMinAgo.toISOString())).toBe('5m ago');

    const twoHoursAgo = new Date(Date.now() - 2 * 3600 * 1000);
    expect(formatTimeAgo(twoHoursAgo.toISOString())).toBe('2h ago');
  });
});

describe('shortId', () => {
  it('truncates long transaction IDs with ellipsis', () => {
    const longId = 'txn_demo_82937402948271';
    expect(shortId(longId)).toBe('txn_demo…948271');
  });

  it('returns short IDs unmodified', () => {
    expect(shortId('txn_12345')).toBe('txn_12345');
    expect(shortId('')).toBe('—');
  });
});
