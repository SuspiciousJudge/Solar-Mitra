import { STATES } from '@/data/states';

export interface BillExtraction {
  state?: string;
  monthlyUnits?: number;
  monthlyBill?: number;
  consumerName?: string;
  consumerNumber?: string;
  discom?: string;
  meterNumber?: string;
  billingPeriod?: string;
  sanctionedLoad?: string;
  rawText: string;
}

const tidy = (value: string) => value.replace(/[|]/g, ' ').replace(/\s+/g, ' ').trim().replace(/^[^a-z0-9₹]+/i, '').replace(/[,:;\-]+$/, '');
const numberAfterLabel = (line: string, label: RegExp): number | undefined => {
  const match = line.match(label);
  if (!match) return undefined;
  const tail = line.slice((match.index ?? 0) + match[0].length);
  const number = tail.match(/(?:₹|rs\.?\s*)?([\d][\d,]*(?:\.\d{1,2})?)/i)?.[1];
  if (!number) return undefined;
  const value = Number(number.replace(/,/g, ''));
  return Number.isFinite(value) ? value : undefined;
};
const labelledValue = (lines: string[], label: RegExp): string | undefined => {
  for (const line of lines) {
    const match = label.exec(line);
    if (!match) continue;
    const value = tidy(line.slice((match.index ?? 0) + match[0].length)
      .replace(/^\s*[:#\-]\s*/, '')
      .replace(/\s+(?:consumer\s*(?:name|no\.?|number|id)|billing\s*period|state|sanctioned\s*load|discom|meter\s*(?:no\.?|number|id)|units?\s*(?:consumed|used)|(?:amount\s*(?:due|payable)|current\s*bill|bill\s*amount|total\s*due))\s*[:#=\-]?.*$/i, ''));
    if (value && !/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(value)) return value.slice(0, 100);
  }
  return undefined;
};

/** Extract likely bill fields from OCR text. Unknown values stay empty for user review. */
export function extractBillFields(rawText: string): BillExtraction {
  const lines = rawText.split(/\r?\n/).map(tidy).filter(Boolean);
  const normalized = rawText.toLowerCase();
  const state = STATES.filter((candidate) => candidate !== 'Other').find((candidate) =>
    normalized.includes(candidate.toLowerCase()),
  );

  let monthlyUnits: number | undefined;
  for (const line of lines) {
    if (!/(units?\s*(consumed|used)|energy\s*consumed|consumption|kwh)/i.test(line)) continue;
    monthlyUnits = numberAfterLabel(line, /(?:units?\s*(?:consumed|used)?|energy\s*consumed|consumption|kwh)\s*(?:in\s*units)?\s*[:#=\-]?\s*/i);
    if (monthlyUnits !== undefined && monthlyUnits > 0 && monthlyUnits <= 20000) break;
    monthlyUnits = undefined;
  }

  let monthlyBill: number | undefined;
  for (const line of lines) {
    if (!/(amount\s*(?:due|payable)|net\s*payable|current\s*bill|bill\s*amount|total\s*due)/i.test(line)) continue;
    monthlyBill = numberAfterLabel(line, /(?:amount\s*(?:due|payable)|net\s*payable|current\s*bill|bill\s*amount|total\s*due)\s*[:#=\-]?\s*/i);
    if (monthlyBill !== undefined && monthlyBill <= 1_000_000) break;
    monthlyBill = undefined;
  }

  const consumerNumber = labelledValue(lines, /(?:consumer\s*(?:no\.?|number|id)|account\s*(?:no\.?|number)|service\s*(?:no\.?|number))\s*[:#=\-]?\s*/i)?.match(/[A-Z0-9][A-Z0-9\-/]{3,}/i)?.[0];
  const discom = labelledValue(lines, /(?:electricity\s*board|distribution\s*company|discom)\s*[:#=\-]?\s*/i);
  const consumerName = labelledValue(lines, /(?:consumer\s*name|name\s*of\s*consumer|customer\s*name)\s*[:#=\-]?\s*/i);
  const meterNumber = labelledValue(lines, /(?:meter\s*(?:no\.?|number|id))\s*[:#=\-]?\s*/i)?.match(/[A-Z0-9][A-Z0-9\-/]{2,}/i)?.[0];
  const billingPeriod = labelledValue(lines, /(?:billing\s*period|bill\s*period|reading\s*period)\s*[:#=\-]?\s*/i);
  const loadText = labelledValue(lines, /(?:sanctioned\s*load|connected\s*load)\s*[:#=\-]?\s*/i);
  const loadMatch = loadText?.match(/(\d+(?:\.\d+)?)\s*(kva|kw|hp)\b/i);
  const sanctionedLoad = loadMatch
    ? `${loadMatch[1]} ${loadMatch[2].toLowerCase() === 'kw' ? 'kW' : loadMatch[2].toUpperCase()}`
    : loadText;

  return { state, monthlyUnits, monthlyBill, consumerName, consumerNumber, discom, meterNumber, billingPeriod, sanctionedLoad, rawText };
}
