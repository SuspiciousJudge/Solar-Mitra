import type { Request, Response } from 'express';
import type { z } from 'zod';
import { getValidatedQuery } from '../middleware/validate';
import { getStore } from '../services/dataStore';
import { EMPTY_FILTERS, matchesTransactionAttributes, toRecordFilters, type RawFilterQuery, type RecordFilters } from '../services/filters';
import { applyScope } from './analyticsController';
import { canRecordTransactions } from '../services/statusMachine';
import { csvFilename, sendCsv, toCsv } from '../services/csv';
import { AppError, notFound } from '../utils/AppError';
import { sendSuccess } from '../utils/apiResponse';
import { TRANSACTION_DIRECTIONS, type Transaction } from '../types';
import type { transactionSchema } from '../validators/schemas';

export interface TransactionQuery extends RecordFilters {
  kind?: string[];
  sortBy: 'at' | 'amountINR' | 'kind';
  order: 'asc' | 'desc';
  page: number;
  limit: number;
}

function paginate(transactions: Transaction[], query: TransactionQuery) {
  const matched = transactions.filter((transaction) => matchesTransactionAttributes(transaction, query));
  const filtered = query.kind && query.kind.length > 0 ? matched.filter((transaction) => query.kind?.includes(transaction.kind)) : matched;
  const direction = query.order === 'asc' ? 1 : -1;
  const sorted = [...filtered].sort((a, b) => {
    if (query.sortBy === 'amountINR') return (a.amountINR - b.amountINR) * direction;
    if (query.sortBy === 'kind') return a.kind.localeCompare(b.kind) * direction;
    return (new Date(a.at).getTime() - new Date(b.at).getTime()) * direction;
  });
  const pages = Math.max(1, Math.ceil(sorted.length / query.limit));
  const page = Math.min(Math.max(1, query.page), pages);
  const start = (page - 1) * query.limit;
  return {
    items: sorted.slice(start, start + query.limit),
    total: sorted.length,
    page,
    pages,
    limit: query.limit,
    totals: {
      amountINR: Math.round(filtered.reduce((sum, transaction) => sum + transaction.amountINR, 0)),
      inflowINR: Math.round(filtered.filter((transaction) => transaction.direction === 'inflow').reduce((sum, transaction) => sum + transaction.amountINR, 0)),
      outflowINR: Math.round(filtered.filter((transaction) => transaction.direction === 'outflow').reduce((sum, transaction) => sum + transaction.amountINR, 0)),
    },
  };
}

function toTransactionQuery(req: Request): TransactionQuery {
  const raw = getValidatedQuery<RawFilterQuery & Pick<TransactionQuery, 'kind' | 'sortBy' | 'order' | 'page' | 'limit'>>(req);
  return { ...toRecordFilters(raw), kind: raw.kind, sortBy: raw.sortBy, order: raw.order, page: raw.page, limit: raw.limit };
}

export async function listTransactions(req: Request, res: Response) {
  const query = toTransactionQuery(req);
  const transactions = await getStore().listTransactions();
  sendSuccess(res, paginate(transactions, applyScope(req, query) as TransactionQuery));
}

export async function createTransaction(req: Request, res: Response) {
  const input = req.body as z.infer<typeof transactionSchema>;
  if (!req.auth) throw new AppError(401, 'Please sign in to continue');
  if (!canRecordTransactions(req.auth.role)) throw new AppError(403, 'Your role cannot record transactions');

  const store = getStore();
  const application = await store.getApplication(input.applicationId);
  if (!application) throw notFound('Application');

  const transaction = await store.createTransaction({
    applicationId: application.id,
    applicantName: application.applicantName,
    kind: input.kind as Transaction['kind'],
    amountINR: input.amountINR,
    dpd: input.kind === 'EMI Repayment' ? input.dpd ?? 0 : undefined,
    state: application.state,
    district: application.district,
    discom: application.discom,
    schemeIds: application.schemeIds,
    vendorId: application.vendorId,
    paymentMode: application.paymentMode,
    reference: input.reference,
    note: input.note,
    at: input.at ? new Date(input.at).toISOString() : new Date().toISOString(),
    byUserId: req.auth.sub,
    byName: req.auth.name,
    role: req.auth.role,
  });

  // EMI repayments also update the application's repayment health aggregate.
  if (input.kind === 'EMI Repayment') await store.applyRepayment(application.id, input.dpd ?? 0);

  sendSuccess(res, { ...transaction, direction: TRANSACTION_DIRECTIONS[transaction.kind] }, 201);
}

const TRANSACTION_CSV_COLUMNS = [
  { key: 'id', label: 'Transaction ID', value: (row: Transaction) => row.id },
  { key: 'at', label: 'Date', value: (row: Transaction) => row.at.slice(0, 10) },
  { key: 'kind', label: 'Type', value: (row: Transaction) => row.kind },
  { key: 'direction', label: 'Direction', value: (row: Transaction) => row.direction },
  { key: 'amountINR', label: 'Amount (INR)', value: (row: Transaction) => row.amountINR },
  { key: 'applicationId', label: 'Application ID', value: (row: Transaction) => row.applicationId },
  { key: 'applicantName', label: 'Applicant', value: (row: Transaction) => row.applicantName },
  { key: 'state', label: 'State/UT', value: (row: Transaction) => row.state },
  { key: 'district', label: 'District', value: (row: Transaction) => row.district ?? '' },
  { key: 'discom', label: 'DISCOM', value: (row: Transaction) => row.discom ?? '' },
  { key: 'paymentMode', label: 'Payment mode', value: (row: Transaction) => (row.paymentMode === 'loan' ? 'Loan' : 'Upfront') },
  { key: 'dpd', label: 'Days past due', value: (row: Transaction) => row.dpd ?? '' },
  { key: 'reference', label: 'Reference', value: (row: Transaction) => row.reference ?? '' },
  { key: 'recordedBy', label: 'Recorded by', value: (row: Transaction) => `${row.byName} (${row.role})` },
  { key: 'schemes', label: 'Schemes', value: (row: Transaction) => row.schemeIds.join(' | ') },
];

export async function exportTransactions(req: Request, res: Response) {
  const query = toTransactionQuery(req);
  const transactions = await getStore().listTransactions();
  const scoped = transactions.filter((transaction) => matchesTransactionAttributes(transaction, applyScope(req, query ?? EMPTY_FILTERS)));
  const matched = query.kind && query.kind.length > 0 ? scoped.filter((transaction) => query.kind?.includes(transaction.kind)) : scoped;
  const sorted = [...matched].sort((a, b) => (a.at < b.at ? 1 : -1));
  sendCsv(res, csvFilename('solarmitra-transactions'), toCsv(sorted, TRANSACTION_CSV_COLUMNS));
}
