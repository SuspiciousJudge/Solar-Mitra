import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ApplicationStatus, OperatorFilterState, PaymentMode } from '@/types';
import {
  EMPTY_OPERATOR_FILTERS,
  countActiveFilters,
  describeFilters,
  fromQueryParams,
  toQueryParams,
  toggleValue,
} from '@/utils/operatorFilters';

export interface OperatorFiltersApi {
  filters: OperatorFilterState;
  /** Same object with `preset`/`from`/`to` filled in from `asOf` for date presets. */
  queryParams: Record<string, string>;
  activeCount: number;
  chips: ReturnType<typeof describeFilters>;
  hasFilters: boolean;
  setFilter: <K extends keyof OperatorFilterState>(key: K, value: OperatorFilterState[K]) => void;
  toggle: (key: 'states' | 'districts' | 'discoms' | 'schemes' | 'statuses' | 'vendors', value: string) => void;
  setPaymentMode: (mode: PaymentMode | undefined) => void;
  setPreset: (preset: string, range?: { from?: string; to?: string }) => void;
  reset: () => void;
}

/**
 * Keeps the operator filters in the URL, so a filtered dashboard can be shared,
 * bookmarked or reloaded without losing context. Every consumer (analytics,
 * leads, transactions, CSV export) reads the same object.
 */
export function useOperatorFilters(initial: Partial<OperatorFilterState> = {}): OperatorFiltersApi {
  const [params, setParams] = useSearchParams();
  const filters = useMemo<OperatorFilterState>(() => ({ ...EMPTY_OPERATOR_FILTERS, ...fromQueryParams(params), ...initial }), [params, initial]);

  const commit = useCallback(
    (next: OperatorFilterState) => {
      // Empty values are dropped so the URL stays readable.
      setParams(toQueryParams(next), { replace: true });
    },
    [setParams],
  );

  const setFilter = useCallback(
    <K extends keyof OperatorFilterState>(key: K, value: OperatorFilterState[K]) => commit({ ...filters, [key]: value }),
    [commit, filters],
  );

  const toggle = useCallback(
    (key: 'states' | 'districts' | 'discoms' | 'schemes' | 'statuses' | 'vendors', value: string) => {
      const next = toggleValue(filters[key] as string[], value);
      // Changing the district list invalidates discoms picked from the old list.
      const patched: OperatorFilterState = { ...filters, [key]: next };
      if (key === 'states') patched.districts = [];
      if (key === 'states' || key === 'districts') patched.discoms = [];
      commit(patched);
    },
    [commit, filters],
  );

  const setPaymentMode = useCallback((mode: PaymentMode | undefined) => commit({ ...filters, paymentMode: mode }), [commit, filters]);

  const setPreset = useCallback(
    (preset: string, range: { from?: string; to?: string } = {}) => commit({ ...filters, preset, from: range.from, to: range.to }),
    [commit, filters],
  );

  const reset = useCallback(() => setParams({}, { replace: true }), [setParams]);

  return {
    filters,
    queryParams: toQueryParams(filters),
    activeCount: countActiveFilters(filters),
    chips: describeFilters(filters),
    hasFilters: countActiveFilters(filters) > 0,
    setFilter,
    toggle,
    setPaymentMode,
    setPreset,
    reset,
  };
}

export type { ApplicationStatus };
