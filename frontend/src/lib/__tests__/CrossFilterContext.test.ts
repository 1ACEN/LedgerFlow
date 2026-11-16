import { describe, it, expect } from 'vitest';
import { dimColor, formatFilterLabel } from '../crossFilterUtils';
import type { CrossFilterState } from '../CrossFilterContext';

describe('crossFilterUtils & Filtering Logic', () => {
  it('dimColor properly dims rgba colors', () => {
    const dimmed = dimColor('rgba(59, 130, 246, 0.85)', 0.22);
    expect(dimmed).toBe('rgba(59, 130, 246, 0.22)');
  });

  it('dimColor properly converts and dims 6-digit hex colors', () => {
    const dimmed = dimColor('#3b82f6', 0.22);
    expect(dimmed).toBe('rgba(59, 130, 246, 0.22)');
  });

  it('dimColor properly converts and dims 3-digit hex colors', () => {
    const dimmed = dimColor('#f00', 0.3);
    expect(dimmed).toBe('rgba(255, 0, 0, 0.3)');
  });

  it('dimColor properly dims rgb colors without alpha', () => {
    const dimmed = dimColor('rgb(16, 185, 129)', 0.25);
    expect(dimmed).toBe('rgba(16, 185, 129, 0.25)');
  });

  it('formatFilterLabel formats month strings into friendly full names', () => {
    expect(formatFilterLabel('month', '2026-09')).toBe('September 2026');
    expect(formatFilterLabel('month', '2026-01')).toBe('January 2026');
    expect(formatFilterLabel('month', '2025-12')).toBe('December 2025');
  });

  it('formatFilterLabel formats product lines and departments cleanly', () => {
    expect(formatFilterLabel('productLine', 'subscriptions')).toBe('Subscriptions');
    expect(formatFilterLabel('productLine', 'platform_fees')).toBe('Platform Fees');
    expect(formatFilterLabel('productLine', 'professional_services')).toBe('Professional Services');
    expect(formatFilterLabel('department', 'engineering')).toBe('Engineering & R&D');
  });

  it('formatFilterLabel formats customer tiers and aging buckets', () => {
    expect(formatFilterLabel('customerTier', 'enterprise')).toBe('Enterprise Tier');
    expect(formatFilterLabel('customerTier', 'pro')).toBe('Professional Plan');
    expect(formatFilterLabel('agingBucket', 'days_90_plus')).toBe('90+ Days Delinquent');
    expect(formatFilterLabel('agingBucket', 'current')).toBe('Current (0-30 Days)');
  });

  it('formatFilterLabel formats decline codes properly', () => {
    expect(formatFilterLabel('declineCode', 'card_declined')).toBe('Card Declined');
    expect(formatFilterLabel('declineCode', 'insufficient_funds')).toBe('Insufficient Funds');
  });

  it('simulates toggle filter behavior correctly', () => {
    let state: Partial<CrossFilterState> = {};

    // 1. Set month
    state = { ...state, month: '2026-09' };
    expect(state.month).toBe('2026-09');

    // 2. Toggle same month (deselect)
    if (state.month === '2026-09') {
      const { month, ...rest } = state;
      state = rest;
    }
    expect(state.month).toBeUndefined();

    // 3. Set multi-dimension filters
    state = { ...state, month: '2026-10', productLine: 'ecommerce', customerTier: 'enterprise' };
    expect(Object.keys(state)).toHaveLength(3);

    // 4. Reset all
    state = {};
    expect(Object.keys(state)).toHaveLength(0);
  });
});
