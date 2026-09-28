import type { Transaction, TransactionPage, TransactionQuery, TransactionKind } from '@/types';
import { toQueryParams } from '@/utils/operatorFilters';
import { api, unwrap } from './api';

export interface NewTransactionPayload {
  applicationId: string;
  kind: TransactionKind;
  amountINR: number;
  dpd?: number;
  reference?: string;
  note?: string;
  at?: string;
}

export function fetchTransactions(query: TransactionQuery = {}) {
  const { kind, sortBy, order, page, limit, ...filters } = query;
  return unwrap<TransactionPage>(
    api.get('/transactions', {
      params: {
        ...toQueryParams({ states: [], districts: [], discoms: [], schemes: [], statuses: [], vendors: [], ...filters }),
        ...(kind && kind.length ? { kind: kind.join(',') } : {}),
        ...(sortBy ? { sortBy } : {}),
        ...(order ? { order } : {}),
        ...(page ? { page } : {}),
        ...(limit ? { limit } : {}),
      },
    }),
  );
}

export const createTransaction = (payload: NewTransactionPayload) => unwrap<Transaction>(api.post('/transactions', payload));

/** Download URL for the current filter selection (CSV, same query params). */
export function transactionsExportUrl(query: TransactionQuery = {}): string {
  const { kind, sortBy, order, page, limit, ...filters } = query;
  const params = new URLSearchParams({
    ...toQueryParams({ states: [], districts: [], discoms: [], schemes: [], statuses: [], vendors: [], ...filters }),
    ...(kind && kind.length ? { kind: kind.join(',') } : {}),
    ...(sortBy ? { sortBy } : {}),
    ...(order ? { order } : {}),
  });
  return `/api/transactions/export.csv?${params.toString()}`;
}
