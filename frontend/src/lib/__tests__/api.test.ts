import { describe, it, expect } from 'vitest';
import { fmt_usd, timeAgo } from '../api';

// ── fmt_usd ─────────────────────────────────────────────────────────

describe('fmt_usd', () => {
  it('formats a normal positive number', () => {
    expect(fmt_usd(1234.5)).toBe('$1,234.50');
  });

  it('formats zero', () => {
    expect(fmt_usd(0)).toBe('$0.00');
  });

  it('formats negative numbers', () => {
    const result = fmt_usd(-500);
    expect(result).toMatch(/\$.*500/);
  });

  it('returns em dash for null', () => {
    expect(fmt_usd(null)).toBe('—');
  });

  it('returns em dash for undefined', () => {
    expect(fmt_usd(undefined)).toBe('—');
  });

  it('returns em dash for NaN', () => {
    expect(fmt_usd(NaN)).toBe('—');
  });
});

// ── timeAgo ─────────────────────────────────────────────────────────

describe('timeAgo', () => {
  it('returns empty string for null/undefined', () => {
    expect(timeAgo(null)).toBe('');
    expect(timeAgo(undefined)).toBe('');
  });

  it('returns "just now" for very recent', () => {
    const now = new Date().toISOString();
    expect(timeAgo(now)).toBe('just now');
  });

  it('returns seconds ago', () => {
    const d = new Date(Date.now() - 30_000).toISOString();
    expect(timeAgo(d)).toBe('30s ago');
  });

  it('returns minutes ago', () => {
    const d = new Date(Date.now() - 180_000).toISOString();
    expect(timeAgo(d)).toBe('3m ago');
  });

  it('returns hours ago', () => {
    const d = new Date(Date.now() - 7_200_000).toISOString();
    expect(timeAgo(d)).toBe('2h ago');
  });
});
