import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';

export interface FilterState {
  month: string | null;
  productLine: string | null;
  department: string | null;
  customerTier: string | null;
  agingBucket: string | null;
  declineCode: string | null;
  date: string | null;
}

export type CrossFilterState = FilterState;

export const INITIAL_FILTERS: FilterState = {
  month: null,
  productLine: null,
  department: null,
  customerTier: null,
  agingBucket: null,
  declineCode: null,
  date: null,
};

interface CrossFilterContextValue {
  filters: FilterState;
  activeFilterCount: number;
  hasActiveFilters: boolean;
  setFilter: (key: keyof FilterState, value: string | null) => void;
  toggleFilter: (key: keyof FilterState, value: string) => void;
  clearFilter: (key: keyof FilterState) => void;
  resetAll: () => void;
}

const CrossFilterContext = createContext<CrossFilterContextValue | undefined>(undefined);

export interface CrossFilterProviderProps {
  children: React.ReactNode;
  initialFilters?: Partial<FilterState>;
}

export const CrossFilterProvider: React.FC<CrossFilterProviderProps> = ({
  children,
  initialFilters,
}) => {
  const [filters, setFilters] = useState<FilterState>(() => ({
    ...INITIAL_FILTERS,
    ...initialFilters,
  }));

  const setFilter = useCallback((key: keyof FilterState, value: string | null) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const toggleFilter = useCallback((key: keyof FilterState, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: prev[key] === value ? null : value,
    }));
  }, []);

  const clearFilter = useCallback((key: keyof FilterState) => {
    setFilters((prev) => ({
      ...prev,
      [key]: null,
    }));
  }, []);

  const resetAll = useCallback(() => {
    setFilters(INITIAL_FILTERS);
  }, []);

  // Keyboard shortcut: Escape clears all active cross-filters
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        resetAll();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [resetAll]);

  const activeFilterCount = useMemo(() => {
    return Object.values(filters).filter((val) => val !== null && val !== '').length;
  }, [filters]);

  const hasActiveFilters = activeFilterCount > 0;

  const value = useMemo(
    () => ({
      filters,
      activeFilterCount,
      hasActiveFilters,
      setFilter,
      toggleFilter,
      clearFilter,
      resetAll,
    }),
    [filters, activeFilterCount, hasActiveFilters, setFilter, toggleFilter, clearFilter, resetAll]
  );

  return <CrossFilterContext.Provider value={value}>{children}</CrossFilterContext.Provider>;
};

export function useCrossFilter(): CrossFilterContextValue {
  const context = useContext(CrossFilterContext);
  if (!context) {
    // Graceful fallback if a component is used outside a provider
    return {
      filters: INITIAL_FILTERS,
      activeFilterCount: 0,
      hasActiveFilters: false,
      setFilter: () => {},
      toggleFilter: () => {},
      clearFilter: () => {},
      resetAll: () => {},
    };
  }
  return context;
}
