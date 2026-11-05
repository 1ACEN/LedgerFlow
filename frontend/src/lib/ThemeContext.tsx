import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';

export type Theme = 'light' | 'dark';

export interface ChartThemeColors {
  grid: string;
  ticks: string;
  legend: string;
  doughnutBorder: string;
  tooltipBg: string;
  tooltipText: string;
  cardBg: string;
}

export function getChartTheme(theme: Theme): ChartThemeColors {
  return {
    grid: theme === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)',
    ticks: theme === 'dark' ? '#94a3b8' : '#475569',
    legend: theme === 'dark' ? '#8da2c0' : '#334155',
    doughnutBorder: theme === 'dark' ? '#000000' : '#ffffff',
    tooltipBg: theme === 'dark' ? '#18181b' : '#0f172a',
    tooltipText: '#ffffff',
    cardBg: theme === 'dark' ? '#000000' : '#ffffff',
  };
}

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
  chartColors: ChartThemeColors;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'ledgerflow-theme';

function getInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
    if (typeof window !== 'undefined' && window.matchMedia) {
      if (window.matchMedia('(prefers-color-scheme: light)').matches) {
        return 'light';
      }
    }
  } catch {
    // ignore local storage restrictions in sandboxed iframes
  }
  return 'dark'; // default to LedgerFlow dark observability mode
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.style.colorScheme = theme;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setTheme = (t: Theme) => {
    setThemeState(t);
  };

  const chartColors = useMemo(() => getChartTheme(theme), [theme]);

  const value = useMemo(
    () => ({
      theme,
      toggleTheme,
      setTheme,
      chartColors,
    }),
    [theme, chartColors]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Provide a safe fallback if rendered outside provider (e.g. in standalone unit tests)
    return {
      theme: 'dark',
      toggleTheme: () => {},
      setTheme: () => {},
      chartColors: getChartTheme('dark'),
    };
  }
  return ctx;
}

