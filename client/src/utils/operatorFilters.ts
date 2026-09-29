/**
 * Operator filters are the single source of truth for what every dashboard KPI,
 * lead table and CSV export shows. The same query string drives `/api/analytics/*`,
 * `/api/leads` and `/api/transactions`, so the numbers always agree.
 *
 * This module is dependency-free (no React, no axios) so it can be unit-tested.
 */
import type { ApplicationStatus, OperatorFilterState } from '@/types';

export type { OperatorFilterState };

export type DatePresetId = 'all-time' | 'this-month' | 'last-3-months' | 'fy-2026-27' | 'custom';

export type OperatorFilterKey = 'states' | 'districts' | 'discoms' | 'schemes' | 'statuses' | 'vendors';

export const EMPTY_OPERATOR_FILTERS: OperatorFilterState = {
  states: [],
  districts: [],
  discoms: [],
  schemes: [],
  statuses: [],
  vendors: [],
};

export interface DatePresetDefinition {
  id: DatePresetId;
  label: string;
  /** Presets other than `custom` are resolved from the dashboard's as-of date. */
  resolve?: (asOf: Date) => { from: string; to: string };
}

const iso = (date: Date) => date.toISOString().slice(0, 10);

/** Indian financial year runs 1 April → 31 March. */
export function financialYearRange(asOf: Date): { from: string; to: string; label: string } {
  const year = asOf.getUTCMonth() + 1 >= 4 ? asOf.getUTCFullYear() : asOf.getUTCFullYear() - 1;
  return { from: `${year}-04-01`, to: `${year + 1}-03-31`, label: `FY ${year}-${String((year + 1) % 100).padStart(2, '0')}` };
}

export const DATE_PRESETS: DatePresetDefinition[] = [
  { id: 'all-time', label: 'All time' },
  {
    id: 'this-month',
    label: 'This month',
    resolve: (asOf) => ({ from: iso(new Date(Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), 1))), to: iso(asOf) }),
  },
  {
    id: 'last-3-months',
    label: 'Last 3 months',
    resolve: (asOf) => ({ from: iso(new Date(Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth() - 2, 1))), to: iso(asOf) }),
  },
  {
    id: 'fy-2026-27',
    label: financialYearRange(new Date()).label,
    resolve: (asOf) => financialYearRange(asOf),
  },
  { id: 'custom', label: 'Custom range' },
];

/**
 * Materialises a preset into concrete dates. `all-time` clears both bounds so
 * the API falls back to the full seeded window.
 */
export function resolvePreset(preset: string | undefined, asOf: Date): { from?: string; to?: string } {
  if (!preset || preset === 'all-time') return {};
  if (preset === 'custom') return {};
  const definition = DATE_PRESETS.find((entry) => entry.id === preset);
  return definition?.resolve?.(asOf) ?? {};
}

/** Locks the dates for a preset after the API reports its as-of date. */
export function withPresetDates(filters: OperatorFilterState, preset: DatePresetId, asOf: Date): OperatorFilterState {
  if (preset === 'custom') return { ...filters, preset, };
  const range = resolvePreset(preset, asOf);
  return { ...filters, preset, from: range.from, to: range.to };
}

const asList = (value: string | undefined): string[] =>
  value
    ? value
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean)
    : [];

/** Serialises filters into the query params the API understands (comma-joined lists). */
export function toQueryParams(filters: OperatorFilterState): Record<string, string> {
  const params: Record<string, string> = {};
  if (filters.states.length) params.state = filters.states.join(',');
  if (filters.districts.length) params.district = filters.districts.join(',');
  if (filters.discoms.length) params.discom = filters.discoms.join(',');
  if (filters.schemes.length) params.scheme = filters.schemes.join(',');
  if (filters.statuses.length) params.status = filters.statuses.join(',');
  if (filters.vendors.length) params.vendor = filters.vendors.join(',');
  if (filters.paymentMode) params.paymentMode = filters.paymentMode;
  if (filters.search?.trim()) params.search = filters.search.trim();
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  if (filters.preset && filters.preset !== 'all-time') params.preset = filters.preset;
  return params;
}

export function fromQueryParams(params: URLSearchParams | Record<string, string | undefined>): OperatorFilterState {
  const read = (key: string): string | undefined =>
    params instanceof URLSearchParams ? (params.get(key) ?? undefined) : params[key];
  const statuses = asList(read('status')).filter((value): value is ApplicationStatus => Boolean(value));
  const paymentMode = read('paymentMode');
  return {
    states: asList(read('state')),
    districts: asList(read('district')),
    discoms: asList(read('discom')),
    schemes: asList(read('scheme')),
    statuses,
    vendors: asList(read('vendor')),
    paymentMode: paymentMode === 'loan' || paymentMode === 'upfront' ? paymentMode : undefined,
    search: read('search')?.trim() || undefined,
    preset: (read('preset') as DatePresetId | undefined) ?? 'all-time',
    from: read('from'),
    to: read('to'),
  };
}

export function toSearchParams(filters: OperatorFilterState): URLSearchParams {
  return new URLSearchParams(toQueryParams(filters));
}

/** Toggle helper used by every multi-select control. */
export function toggleValue<T extends string>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value];
}

export function countActiveFilters(filters: OperatorFilterState): number {
  return (
    filters.states.length +
    filters.districts.length +
    filters.discoms.length +
    filters.schemes.length +
    filters.statuses.length +
    filters.vendors.length +
    (filters.paymentMode ? 1 : 0) +
    (filters.search?.trim() ? 1 : 0) +
    (filters.from || filters.to ? 1 : 0)
  );
}

export function hasActiveFilters(filters: OperatorFilterState): boolean {
  return countActiveFilters(filters) > 0;
}

export interface FilterChip {
  key: string;
  label: string;
  value?: string;
}

/** Human-readable chips for the active filter bar. */
export function describeFilters(filters: OperatorFilterState): FilterChip[] {
  const chips: FilterChip[] = [];
  const push = (key: string, label: string, values: string[], value?: string) => {
    if (values.length) chips.push({ key, label, value: values.length > 2 ? `${values.length} selected` : values.join(', ') });
    else if (value) chips.push({ key, label, value });
  };
  push('states', 'State', filters.states);
  push('districts', 'District', filters.districts);
  push('discoms', 'Discom', filters.discoms);
  push('schemes', 'Scheme', filters.schemes);
  push('statuses', 'Status', filters.statuses);
  push('vendors', 'Vendor', filters.vendors);
  push('paymentMode', 'Payment', [], filters.paymentMode === 'loan' ? 'Financed' : filters.paymentMode === 'upfront' ? 'Upfront' : undefined);
  push('search', 'Search', [], filters.search?.trim());
  if (filters.from || filters.to) chips.push({ key: 'dates', label: 'Period', value: `${filters.from ?? 'start'} → ${filters.to ?? 'today'}` });
  return chips;
}

/** Short label shown on the dashboard header, e.g. "Uttar Pradesh · Financed · Sep 2026". */
export function describePeriod(filters: OperatorFilterState): string | undefined {
  const preset = DATE_PRESETS.find((entry) => entry.id === (filters.preset ?? 'all-time'));
  if (!filters.from && !filters.to) return preset?.id === 'all-time' ? 'All time' : undefined;
  if (filters.preset && filters.preset !== 'custom') return preset?.label;
  return `${filters.from ?? 'start'} → ${filters.to ?? 'today'}`;
}
