import { describe, it, expect } from 'vitest';
import { getChartTheme } from '../ThemeContext';

describe('ThemeContext - getChartTheme', () => {
  it('returns appropriate colors for dark theme (pitch black foundation)', () => {
    const darkTheme = getChartTheme('dark');
    expect(darkTheme.grid).toBe('rgba(255, 255, 255, 0.06)');
    expect(darkTheme.ticks).toBe('#94a3b8');
    expect(darkTheme.legend).toBe('#8da2c0');
    expect(darkTheme.doughnutBorder).toBe('#000000');
    expect(darkTheme.cardBg).toBe('#000000');
    expect(darkTheme.tooltipBg).toBe('#18181b');
    expect(darkTheme.tooltipText).toBe('#ffffff');
  });

  it('returns appropriate colors for light theme (pure white foundation)', () => {
    const lightTheme = getChartTheme('light');
    expect(lightTheme.grid).toBe('rgba(0, 0, 0, 0.06)');
    expect(lightTheme.ticks).toBe('#475569');
    expect(lightTheme.legend).toBe('#334155');
    expect(lightTheme.doughnutBorder).toBe('#ffffff');
    expect(lightTheme.cardBg).toBe('#ffffff');
    expect(lightTheme.tooltipBg).toBe('#0f172a');
    expect(lightTheme.tooltipText).toBe('#ffffff');
  });
});
