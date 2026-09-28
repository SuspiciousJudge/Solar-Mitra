import { describe, expect, it } from 'vitest';
import {
  EMPTY_OPERATOR_FILTERS,
  countActiveFilters,
  describeFilters,
  describePeriod,
  financialYearRange,
  fromQueryParams,
  resolvePreset,
  toQueryParams,
  toSearchParams,
  toggleValue,
} from './operatorFilters';

const asOf = new Date('2026-09-26T00:00:00.000Z');

describe('operator filter serialisation', () => {
  it('joins list filters into the API query params', () => {
    const params = toQueryParams({
      ...EMPTY_OPERATOR_FILTERS,
      states: ['Uttar Pradesh', 'Gujarat'],
      statuses: ['Approved'],
      paymentMode: 'loan',
      search: '  Rahul  ',
    });
    expect(params).toEqual({ state: 'Uttar Pradesh,Gujarat', status: 'Approved', paymentMode: 'loan', search: 'Rahul' });
  });

  it('omits empty values so URLs stay readable', () => {
    expect(toQueryParams(EMPTY_OPERATOR_FILTERS)).toEqual({});
    expect(toSearchParams(EMPTY_OPERATOR_FILTERS).toString()).toBe('');
  });

  it('round-trips through the URL', () => {
    const filters = { ...EMPTY_OPERATOR_FILTERS, states: ['Tamil Nadu'], schemes: ['pm-surya-ghar-rts'], preset: 'this-month', from: '2026-09-01', to: '2026-09-26' };
    const parsed = fromQueryParams(toSearchParams(filters));
    expect(parsed.states).toEqual(['Tamil Nadu']);
    expect(parsed.schemes).toEqual(['pm-surya-ghar-rts']);
    expect(parsed.preset).toBe('this-month');
    expect(parsed.from).toBe('2026-09-01');
  });

  it('drops junk payment modes and unknown shapes', () => {
    const parsed = fromQueryParams(new URLSearchParams('paymentMode=whatever&status=Approved'));
    expect(parsed.paymentMode).toBeUndefined();
    expect(parsed.statuses).toEqual(['Approved']);
  });

  it('resolves relative presets from the dashboard as-of date', () => {
    expect(resolvePreset('this-month', asOf)).toEqual({ from: '2026-09-01', to: '2026-09-26' });
    expect(resolvePreset('last-3-months', asOf)).toEqual({ from: '2026-07-01', to: '2026-09-26' });
    expect(resolvePreset('all-time', asOf)).toEqual({});
    expect(resolvePreset('custom', asOf)).toEqual({});
  });

  it('computes the Indian financial year (April → March)', () => {
    expect(financialYearRange(asOf)).toEqual({ from: '2026-04-01', to: '2027-03-31', label: 'FY 2026-27' });
    expect(financialYearRange(new Date('2026-02-10T00:00:00.000Z')).from).toBe('2025-04-01');
  });

  it('counts and describes the active filters', () => {
    const filters = { ...EMPTY_OPERATOR_FILTERS, states: ['Uttar Pradesh'], paymentMode: 'loan' as const, search: 'priya' };
    expect(countActiveFilters(filters)).toBe(3);
    const chips = describeFilters(filters);
    expect(chips.map((chip) => chip.key)).toEqual(['states', 'paymentMode', 'search']);
    expect(chips[1].value).toBe('Financed');
    expect(describePeriod({ ...filters, preset: 'fy-2026-27', from: '2026-04-01', to: '2027-03-31' })).toBe('FY 2026-27');
    expect(describePeriod(EMPTY_OPERATOR_FILTERS)).toBe('All time');
  });

  it('toggles values without mutating the input', () => {
    const list = ['Uttar Pradesh'];
    expect(toggleValue(list, 'Gujarat')).toEqual(['Uttar Pradesh', 'Gujarat']);
    expect(toggleValue(list, 'Uttar Pradesh')).toEqual([]);
    expect(list).toEqual(['Uttar Pradesh']);
  });
});
