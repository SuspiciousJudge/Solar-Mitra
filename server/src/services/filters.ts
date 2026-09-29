/**
 * Query-parameter filters shared by the analytics, leads, vendors, transactions
 * and export endpoints. Every operator filter in the UI maps to one of these,
 * so what a KPI shows and what an export contains always agree.
 */
import type { ApplicationStatus, PaymentMode, Transaction } from '../types';
import type { AppliedFilters } from '../types/analytics';
import { MILESTONE_ORDER } from '../config/statusFlow';
import type { Application, SolarAudit } from '../types';

export interface RecordFilters {
  states: string[];
  districts: string[];
  discoms: string[];
  schemes: string[];
  statuses: ApplicationStatus[];
  vendors: string[];
  paymentMode?: PaymentMode;
  assignedTo?: string;
  search?: string;
  from?: string;
  to?: string;
  preset?: string;
}

/** Shape of a zod-parsed filter query (repeatable/comma-separated lists). */
export interface RawFilterQuery {
  state?: string[];
  district?: string[];
  discom?: string[];
  scheme?: string[];
  status?: ApplicationStatus[];
  vendor?: string[];
  paymentMode?: PaymentMode;
  assignedTo?: string;
  search?: string;
  from?: string;
  to?: string;
  preset?: string;
}

/** Normalises a validated query into the filter object the services expect. */
export function toRecordFilters(query: RawFilterQuery | undefined): RecordFilters {
  return {
    states: query?.state ?? [],
    districts: query?.district ?? [],
    discoms: query?.discom ?? [],
    schemes: query?.scheme ?? [],
    statuses: query?.status ?? [],
    vendors: query?.vendor ?? [],
    paymentMode: query?.paymentMode,
    assignedTo: query?.assignedTo,
    search: query?.search,
    from: query?.from,
    to: query?.to,
    preset: query?.preset,
  };
}

export const EMPTY_FILTERS: RecordFilters = {
  states: [],
  districts: [],
  discoms: [],
  schemes: [],
  statuses: [],
  vendors: [],
};

const normalise = (value: string): string => value.trim().toLowerCase();

const listMatches = (selected: string[], value: string | undefined): boolean => {
  if (selected.length === 0) return true;
  if (!value) return false;
  return selected.some((entry) => normalise(entry) === normalise(value));
};

export function matchesAttributes(application: Application, filters: RecordFilters): boolean {
  if (!listMatches(filters.states, application.state)) return false;
  if (!listMatches(filters.districts, application.district)) return false;
  if (!listMatches(filters.discoms, application.discom)) return false;
  if (filters.vendors.length > 0 && !filters.vendors.includes(application.vendorId)) return false;
  if (filters.paymentMode && application.paymentMode !== filters.paymentMode) return false;
  if (filters.statuses.length > 0 && !filters.statuses.includes(application.status)) return false;
  if (filters.schemes.length > 0 && !filters.schemes.some((scheme) => application.schemeIds.includes(scheme))) return false;
  if (filters.assignedTo && application.assignedTo?.userId !== filters.assignedTo) return false;
  if (filters.search) {
    const haystack = `${application.id} ${application.applicantName} ${application.phone} ${application.location} ${application.vendorName ?? ''}`.toLowerCase();
    if (!haystack.includes(filters.search.toLowerCase())) return false;
  }
  return true;
}

/** Transaction-level attribute matching (no date filter — that is applied separately). */
export function matchesTransactionAttributes(transaction: Transaction, filters: RecordFilters): boolean {
  if (!listMatches(filters.states, transaction.state)) return false;
  if (!listMatches(filters.districts, transaction.district)) return false;
  if (!listMatches(filters.discoms, transaction.discom)) return false;
  if (filters.vendors.length > 0 && (!transaction.vendorId || !filters.vendors.includes(transaction.vendorId))) return false;
  if (filters.paymentMode && transaction.paymentMode !== filters.paymentMode) return false;
  if (filters.schemes.length > 0 && !filters.schemes.some((scheme) => transaction.schemeIds.includes(scheme))) return false;
  if (filters.search) {
    const haystack = `${transaction.id} ${transaction.applicationId} ${transaction.applicantName} ${transaction.reference ?? ''}`.toLowerCase();
    if (!haystack.includes(filters.search.toLowerCase())) return false;
  }
  return true;
}

export function matchesAuditAttributes(audit: SolarAudit, filters: RecordFilters): boolean {
  if (!listMatches(filters.states, audit.state)) return false;
  if (!listMatches(filters.districts, audit.district)) return false;
  if (!listMatches(filters.discoms, audit.discom)) return false;
  return true;
}

const DAY_MS = 86_400_000;

const startOfDay = (iso: string): number => new Date(`${iso.slice(0, 10)}T00:00:00.000Z`).getTime();
const endOfDay = (iso: string): number => new Date(`${iso.slice(0, 10)}T23:59:59.999Z`).getTime();

export function inDateRange(timestamp: string, filters: RecordFilters): boolean {
  const value = new Date(timestamp).getTime();
  if (!Number.isFinite(value)) return false;
  if (filters.from && value < startOfDay(filters.from)) return false;
  if (filters.to && value > endOfDay(filters.to)) return false;
  return true;
}

export interface PeriodRange {
  from: string;
  to: string;
  days: number;
  label: string;
  preset: string;
  previousFrom: string;
  previousTo: string;
  explicit: boolean;
}

const iso = (ms: number): string => new Date(ms).toISOString();

/**
 * Current period vs the previous period of equal length.
 * Without an explicit range we use the 30 days ending at `asOf` so the
 * "% change" figures always compare like with like.
 */
export function resolvePeriod(filters: RecordFilters, asOf: string, defaultDays = 30): PeriodRange {
  const asOfMs = new Date(asOf).getTime();
  const explicit = Boolean(filters.from || filters.to);
  const toMs = filters.to ? endOfDay(filters.to) : asOfMs;
  const fromMs = filters.from ? startOfDay(filters.from) : toMs - (defaultDays - 1) * DAY_MS - (DAY_MS - 1);
  const days = Math.max(1, Math.round((toMs - fromMs) / DAY_MS));
  const previousToMs = fromMs - 1;
  const previousFromMs = previousToMs - (days * DAY_MS - 1);
  const label = filters.from || filters.to ? `${iso(fromMs).slice(0, 10)} → ${iso(toMs).slice(0, 10)}` : `Last ${days} days`;
  return {
    from: iso(fromMs),
    to: iso(toMs),
    days,
    label,
    preset: filters.preset ?? (explicit ? 'custom' : 'last-30-days'),
    previousFrom: iso(previousFromMs),
    previousTo: iso(previousToMs),
    explicit,
  };
}

export function inPeriod(timestamp: string | undefined, period: { from: string; to: string }): boolean {
  if (!timestamp) return false;
  const value = new Date(timestamp).getTime();
  if (!Number.isFinite(value)) return false;
  return value >= new Date(period.from).getTime() && value <= new Date(period.to).getTime();
}

/** Highest milestone order reached by the application (Rejected = -1). */
export function highestMilestone(application: Application): number {
  return application.timeline.reduce((best, event) => {
    if (!(event.status in MILESTONE_ORDER)) return best;
    const order = MILESTONE_ORDER[event.status as ApplicationStatus];
    return order > best ? order : best;
  }, MILESTONE_ORDER[application.status]);
}

export function toAppliedFilters(filters: RecordFilters): AppliedFilters {
  return {
    states: filters.states,
    districts: filters.districts,
    discoms: filters.discoms,
    schemes: filters.schemes,
    statuses: filters.statuses,
    vendors: filters.vendors,
    paymentMode: filters.paymentMode,
    assignedTo: filters.assignedTo,
    search: filters.search,
    from: filters.from,
    to: filters.to,
    preset: filters.preset,
  };
}

export function percentChange(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}
