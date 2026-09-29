/** Small CSV writer used by the operator exports (leads, transactions). */
import type { Response } from 'express';

export interface CsvColumn<T> {
  key: string;
  label: string;
  value: (row: T) => string | number | null | undefined;
}

const escapeCell = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((column) => escapeCell(column.label)).join(',');
  const body = rows.map((row) => columns.map((column) => escapeCell(column.value(row))).join(','));
  // BOM keeps the ₹ symbol readable when the file is opened in Excel.
  return `\uFEFF${[header, ...body].join('\r\n')}\r\n`;
}

export function sendCsv(res: Response, filename: string, csv: string): void {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.status(200).send(csv);
}

export function csvFilename(prefix: string): string {
  return `${prefix}-${new Date().toISOString().slice(0, 10)}.csv`;
}
