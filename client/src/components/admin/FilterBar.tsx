import { CalendarRange, Download, FilterX, RefreshCw, Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/input';
import { MultiSelect, type MultiSelectOption } from '@/components/ui/multiselect';
import { SegmentedControl } from '@/components/ui/segmented';
import { INDIA_REGIONS } from '@/data/indiaRegions';
import { useAsync } from '@/hooks/useAsync';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { OperatorFiltersApi } from '@/hooks/useOperatorFilters';
import { fetchSchemes } from '@/services/schemeService';
import { fetchVendors } from '@/services/vendorService';
import { APPLICATION_STATUSES, type PaymentMode } from '@/types';
import { DATE_PRESETS } from '@/utils/operatorFilters';

interface FilterBarProps {
  api: OperatorFiltersApi;
  /** ISO date the dashboard is generated for — shown next to the date range. */
  asOf?: string;
  onExport?: () => void;
  exportLabel?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
}

const paymentOptions: { value: PaymentMode | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'loan', label: 'Financed' },
  { value: 'upfront', label: 'Upfront' },
];

/**
 * Shared operator filter bar: one row of controls that drives every analytics
 * endpoint, the lead table, the money-flow ledger and the CSV exports, so no
 * two views in the console can disagree about what is being shown.
 */
export function FilterBar({ api, asOf, onExport, exportLabel = 'Export CSV', onRefresh, refreshing }: FilterBarProps) {
  const { filters, setFilter, toggle, setPaymentMode, setPreset, reset, chips, activeCount, queryParams } = api;
  const [search, setSearch] = useState(filters.search ?? '');
  const debouncedSearch = useDebouncedValue(search, 350);

  useEffect(() => {
    const trimmed = debouncedSearch.trim();
    if (trimmed !== (filters.search ?? '')) setFilter('search', trimmed || undefined);
    // Committing only on the debounced term keeps typing smooth while the URL stays in sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // Keep the input in step when the URL changes from the outside (back button, chip removal).
  useEffect(() => {
    setSearch((current) => (current.trim() === (filters.search ?? '') ? current : filters.search ?? ''));
  }, [filters.search]);

  const schemes = useAsync(() => fetchSchemes(), []);
  const vendors = useAsync(() => fetchVendors(), []);
  const regions = useMemo(() => INDIA_REGIONS, []);

  const stateOptions = useMemo<MultiSelectOption[]>(
    () => regions.map((region) => ({ value: region.name, label: region.name, hint: `${region.districts.length} districts` })),
    [regions],
  );

  const stateScope = useMemo(
    () => (filters.states.length ? regions.filter((region) => filters.states.includes(region.name)) : regions),
    [regions, filters.states],
  );

  const districtOptions = useMemo<MultiSelectOption[]>(
    () => stateScope.flatMap((region) => region.districts.map((district) => ({ value: district, label: district, hint: region.name }))),
    [stateScope],
  );

  const discomOptions = useMemo<MultiSelectOption[]>(
    () => [...new Set(stateScope.flatMap((region) => region.discoms))].map((discom) => ({ value: discom, label: discom })),
    [stateScope],
  );

  const schemeOptions = useMemo<MultiSelectOption[]>(() => {
    const list = schemes.data ?? [];
    const relevant = filters.states.length ? list.filter((scheme) => !scheme.state || filters.states.includes(scheme.state)) : list;
    return relevant.map((scheme) => ({ value: scheme.id, label: scheme.shortName, hint: scheme.state ?? 'Central' }));
  }, [schemes.data, filters.states]);

  const vendorOptions = useMemo<MultiSelectOption[]>(
    () => (vendors.data?.vendors ?? []).map((vendor) => ({ value: vendor.id, label: vendor.name, hint: vendor.location })),
    [vendors.data],
  );

  const dateValue = filters.preset ?? 'all-time';

  return (
    <Card className="p-4" data-filters={Object.keys(queryParams).length}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex-1">
            <label htmlFor="operator-search" className="sr-only">
              Search applications
            </label>
            <Input
              id="operator-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by applicant, application ID or phone"
              prefix={<Search className="h-4 w-4" aria-hidden="true" />}
              className="h-11 text-sm"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="hidden items-center gap-1.5 text-xs font-semibold text-slate-500 sm:flex">
              <CalendarRange className="h-4 w-4" aria-hidden="true" />
              {asOf ? `Data as of ${new Date(asOf).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'Demo dataset'}
            </span>
            {onRefresh && (
              <Button variant="outline" size="sm" className="h-11" onClick={onRefresh} loading={refreshing}>
                {!refreshing && <RefreshCw className="h-4 w-4" aria-hidden="true" />} Refresh
              </Button>
            )}
            {onExport && (
              <Button variant="subtle" size="sm" className="h-11" onClick={onExport}>
                <Download className="h-4 w-4" aria-hidden="true" /> {exportLabel}
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          <MultiSelect label="State" options={stateOptions} selected={filters.states} onToggle={(value) => toggle('states', value)} onClear={() => setFilter('states', [])} searchable placeholder="All states" />
          <MultiSelect
            label="District"
            options={districtOptions}
            selected={filters.districts}
            onToggle={(value) => toggle('districts', value)}
            onClear={() => setFilter('districts', [])}
            searchable
            disabled={districtOptions.length === 0}
            placeholder={filters.states.length ? 'All districts' : 'Pick a state'}
            emptyLabel="Pick a state first"
          />
          <MultiSelect label="Discom" options={discomOptions} selected={filters.discoms} onToggle={(value) => toggle('discoms', value)} onClear={() => setFilter('discoms', [])} searchable placeholder="All discoms" />
          <MultiSelect
            label="Scheme"
            options={schemeOptions}
            selected={filters.schemes}
            onToggle={(value) => toggle('schemes', value)}
            onClear={() => setFilter('schemes', [])}
            searchable
            placeholder="All schemes"
            emptyLabel={schemes.loading ? 'Loading schemes…' : 'No schemes'}
          />
          <MultiSelect
            label="Status"
            options={APPLICATION_STATUSES.map((status) => ({ value: status, label: status }))}
            selected={filters.statuses}
            onToggle={(value) => toggle('statuses', value)}
            onClear={() => setFilter('statuses', [])}
            searchable
            placeholder="All statuses"
          />
          <MultiSelect
            label="Vendor"
            options={vendorOptions}
            selected={filters.vendors}
            onToggle={(value) => toggle('vendors', value)}
            onClear={() => setFilter('vendors', [])}
            searchable
            placeholder="All vendors"
            emptyLabel={vendors.loading ? 'Loading vendors…' : 'No vendors'}
          />
          <SegmentedControl<PaymentMode | 'all'>
            name="payment-mode"
            label="Payment mode"
            value={filters.paymentMode ?? 'all'}
            onChange={(value) => setPaymentMode(value === 'all' ? undefined : value)}
            options={paymentOptions}
            className="h-11"
          />
          <Select
            aria-label="Date range"
            className="h-11 text-sm font-semibold text-slate-600"
            value={dateValue}
            onChange={(event) => {
              const preset = event.target.value;
              setPreset(preset, preset === 'custom' ? { from: filters.from, to: filters.to } : undefined);
            }}
          >
            {DATE_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
          </Select>
        </div>

        {dateValue === 'custom' && (
          <div className="grid gap-2 sm:grid-cols-2 xl:max-w-md">
            <Input aria-label="From date" type="date" className="h-11 text-sm" value={filters.from ?? ''} onChange={(event) => setFilter('from', event.target.value || undefined)} />
            <Input aria-label="To date" type="date" className="h-11 text-sm" value={filters.to ?? ''} onChange={(event) => setFilter('to', event.target.value || undefined)} />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {activeCount === 0 ? 'No filters applied' : `${activeCount} filter${activeCount === 1 ? '' : 's'} applied`}
          </span>
          {chips.map((chip) => (
            <span key={chip.key} className="inline-flex items-center gap-1 rounded-full bg-forest-50 px-2.5 py-1 text-xs font-semibold text-forest-800 ring-1 ring-inset ring-forest-600/20">
              {chip.key === 'search' ? 'Search' : chip.label}: {chip.value}
              <button
                type="button"
                aria-label={`Remove ${chip.label} filter`}
                className="rounded-full p-0.5 hover:bg-forest-100"
                onClick={() => {
                  if (chip.key === 'paymentMode') setPaymentMode(undefined);
                  else if (chip.key === 'dates') setPreset('all-time');
                  else if (chip.key === 'search') setFilter('search', undefined);
                  else setFilter(chip.key as 'states', []);
                }}
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </span>
          ))}
          {activeCount > 0 && (
            <Button variant="ghost" size="sm" className="ml-auto h-8 text-xs" onClick={reset}>
              <FilterX className="h-3.5 w-3.5" aria-hidden="true" /> Clear all
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
