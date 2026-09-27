const safe = (value: number | null | undefined) => (typeof value === 'number' && Number.isFinite(value) ? value : 0);

const inrFormatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const numberFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 });

/** ₹1,65,000 — Indian digit grouping, never NaN/Infinity. */
export const formatINR = (value: number | null | undefined) => inrFormatter.format(Math.round(safe(value)));

export const formatNumber = (value: number | null | undefined) => numberFormatter.format(safe(value));

/** ₹8.5 Cr / ₹12.4 L style compact currency for dashboards. */
export function formatINRCompact(value: number | null | undefined): string {
  const amount = safe(value);
  if (amount >= 10_000_000) return `₹${(amount / 10_000_000).toFixed(amount >= 100_000_000 ? 1 : 2).replace(/\.?0+$/, '')} Cr`;
  if (amount >= 100_000) return `₹${(amount / 100_000).toFixed(1).replace(/\.0$/, '')} L`;
  return formatINR(amount);
}

export function formatCapacity(kw: number | null | undefined): string {
  const value = safe(kw);
  return value >= 1000 ? `${(value / 1000).toFixed(value % 1000 === 0 ? 1 : 2).replace(/0$/, '')} MW` : `${formatNumber(value)} kW`;
}

export function formatDate(iso: string | undefined, withTime = false): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

/** Parses a user-entered number (accepts "2,800"), returning 0 for anything invalid. */
export function parseAmount(input: string | number): number {
  const value = typeof input === 'number' ? input : Number(String(input).replace(/[^\d.]/g, ''));
  return Number.isFinite(value) && value > 0 ? value : 0;
}
