import { ArrowDownRight, ArrowUpRight, Banknote, ChevronLeft, ChevronRight, Download, Wallet } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FilterBar } from '@/components/admin/FilterBar';
import { PageHeader } from '@/components/admin/PageHeader';
import { EmptyState, ErrorState } from '@/components/shared/States';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAsync } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useOperatorFilters } from '@/hooks/useOperatorFilters';
import { fetchMoneyFlow } from '@/services/analyticsService';
import { fetchTransactions, transactionsExportUrl } from '@/services/transactionService';
import { TRANSACTION_KINDS, type TransactionKind } from '@/types';
import { formatDate, formatINR, formatINRCompact, formatNumber } from '@/utils/format';

const KIND_TONE: Record<string, 'green' | 'red' | 'yellow' | 'purple' | 'blue' | 'gray'> = {
  'Loan Sanctioned': 'purple',
  'Loan Disbursed': 'purple',
  'EMI Repayment': 'green',
  'Subsidy Claimed': 'yellow',
  'Subsidy Credited': 'green',
  'Consumer Upfront Payment': 'blue',
  'Vendor Payout': 'red',
};

export function MoneyFlowPage() {
  useDocumentTitle('Money flow');
  const filters = useOperatorFilters();
  const [kind, setKind] = useState<TransactionKind | ''>('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const query = useAsync(
    () =>
      fetchTransactions({
        ...filters.filters,
        ...(kind ? { kind: [kind] } : {}),
        page,
        limit,
        sortBy: 'at',
        order: 'desc',
      }),
    [JSON.stringify(filters.queryParams), kind, page],
  );

  const summary = useAsync(() => fetchMoneyFlow(filters.queryParams), [JSON.stringify(filters.queryParams)]);
  const data = query.data;
  const flow = summary.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Money flow"
        subtitle="Every rupee traced from the household and the lender to the vendor and back — filterable, auditable and exportable."
        actions={
          <Button variant="subtle" size="sm" onClick={() => (window.location.href = transactionsExportUrl({ ...filters.filters, kind: kind ? [kind] : undefined }))}>
            <Download className="h-4 w-4" aria-hidden="true" /> Export CSV
          </Button>
        }
      />

      <FilterBar api={filters} onRefresh={() => { query.reload(); summary.reload(); }} refreshing={query.loading} />

      <section aria-label="Money totals" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {!flow ? (
          [0, 1, 2, 3].map((index) => <Skeleton key={index} className="h-28 rounded-3xl" />)
        ) : (
          <>
            <Card className="p-5">
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                <ArrowUpRight className="h-4 w-4 text-forest-600" aria-hidden="true" /> Money in
              </p>
              <p className="mt-2 text-2xl font-extrabold tabular-nums text-forest-800">{formatINR(flow.inflowINR)}</p>
              <p className="mt-1 text-xs text-slate-500">EMIs, subsidy credits and consumer payments</p>
            </Card>
            <Card className="p-5">
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                <ArrowDownRight className="h-4 w-4 text-red-600" aria-hidden="true" /> Money out
              </p>
              <p className="mt-2 text-2xl font-extrabold tabular-nums text-red-700">{formatINR(flow.outflowINR)}</p>
              <p className="mt-1 text-xs text-slate-500">Loan disbursements and vendor payouts</p>
            </Card>
            <Card className="p-5">
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                <Wallet className="h-4 w-4 text-slate-500" aria-hidden="true" /> Net movement
              </p>
              <p className="mt-2 text-2xl font-extrabold tabular-nums text-slate-900">{formatINR(flow.inflowINR - flow.outflowINR)}</p>
              <p className="mt-1 text-xs text-slate-500">{formatNumber(flow.totalCount)} transactions in period</p>
            </Card>
            <Card className="p-5">
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                <Banknote className="h-4 w-4 text-solar-600" aria-hidden="true" /> Largest stream
              </p>
              <p className="mt-2 text-lg font-extrabold text-slate-900">
                {[...flow.byKind].sort((a, b) => b.amountINR - a.amountINR)[0]?.kind ?? '—'}
              </p>
              <p className="mt-1 text-xs text-slate-500">{formatINRCompact([...flow.byKind].sort((a, b) => b.amountINR - a.amountINR)[0]?.amountINR ?? 0)} in the selected period</p>
            </Card>
          </>
        )}
      </section>

      {flow && flow.byKind.length > 0 && (
        <Card className="p-5">
          <h2 className="mb-3 font-bold text-slate-900">By transaction type</h2>
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {[...flow.byKind]
              .sort((a, b) => b.amountINR - a.amountINR)
              .map((entry) => (
                <li key={entry.kind} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 px-3 py-2.5">
                  <span className="flex items-center gap-2">
                    <Badge variant={KIND_TONE[entry.kind] ?? 'gray'}>{entry.kind}</Badge>
                    <span className="text-xs text-slate-500">{entry.count}</span>
                  </span>
                  <span className="text-sm font-bold tabular-nums text-slate-900">{formatINRCompact(entry.amountINR)}</span>
                </li>
              ))}
          </ul>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center">
          <h2 className="font-bold text-slate-900">Ledger</h2>
          <div className="sm:ml-auto sm:w-64">
            <label htmlFor="kind-filter" className="sr-only">
              Transaction type
            </label>
            <Select
              id="kind-filter"
              className="h-11 text-sm"
              value={kind}
              onChange={(event) => {
                setKind(event.target.value as TransactionKind | '');
                setPage(1);
              }}
            >
              <option value="">All transaction types</option>
              {TRANSACTION_KINDS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {query.error ? (
          <div className="p-6">
            <ErrorState message={query.error} onRetry={query.reload} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  {['Transaction', 'Application', 'Type', 'Amount', 'Direction', 'Recorded by', 'When'].map((heading) => (
                    <th key={heading} scope="col" className="px-4 py-3">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {query.loading && !data
                  ? Array.from({ length: 6 }).map((_, index) => (
                      <tr key={index}>
                        <td colSpan={7} className="px-4 py-3">
                          <Skeleton className="h-8 w-full" />
                        </td>
                      </tr>
                    ))
                  : data?.items.map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-slate-50/70">
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold text-slate-600">{transaction.id}</td>
                        <td className="px-4 py-3">
                          <Link to={`/admin/applications/${transaction.applicationId}`} className="font-semibold text-forest-800 hover:underline">
                            {transaction.applicationId}
                          </Link>
                          <p className="text-xs text-slate-500">{transaction.applicantName}</p>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={KIND_TONE[transaction.kind] ?? 'gray'}>{transaction.kind}</Badge>
                          {transaction.dpd !== undefined && transaction.dpd > 0 && <p className="mt-1 text-xs font-semibold text-red-600">{transaction.dpd} DPD</p>}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-bold tabular-nums text-slate-900">{formatINR(transaction.amountINR)}</td>
                        <td className="px-4 py-3">
                          {transaction.direction === 'none' ? (
                            <span className="text-slate-400">—</span>
                          ) : (
                            <span className={transaction.direction === 'inflow' ? 'inline-flex items-center gap-1 font-semibold text-forest-700' : 'inline-flex items-center gap-1 font-semibold text-red-700'}>
                              {transaction.direction === 'inflow' ? <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /> : <ArrowDownRight className="h-3.5 w-3.5" aria-hidden="true" />}
                              {transaction.direction}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {transaction.byName}
                          <p className="text-xs text-slate-400">{transaction.role}</p>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatDate(transaction.at, true)}</td>
                      </tr>
                    ))}
              </tbody>
            </table>
            {!query.loading && data && data.items.length === 0 && (
              <div className="p-6">
                <EmptyState
                  title="No transactions in this slice"
                  description="Loosen the filters or widen the date range — subsidy credits and EMIs appear here as operators record them."
                  action={
                    filters.hasFilters && (
                      <Button variant="outline" size="sm" onClick={filters.reset}>
                        Clear filters
                      </Button>
                    )
                  }
                />
              </div>
            )}
          </div>
        )}

        {data && data.total > 0 && (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-500 sm:flex-row">
            <p>
              Showing <strong className="text-slate-800">{(data.page - 1) * data.limit + 1}</strong>–<strong className="text-slate-800">{Math.min(data.page * data.limit, data.total)}</strong> of{' '}
              <strong className="text-slate-800">{data.total}</strong> · total {formatINR(data.totals.amountINR)}
            </p>
            <nav className="flex items-center gap-2" aria-label="Pagination">
              <Button variant="outline" size="sm" disabled={data.page <= 1} onClick={() => setPage((value) => value - 1)} aria-label="Previous page">
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </Button>
              <span className="tabular-nums">
                Page {data.page} of {data.pages}
              </span>
              <Button variant="outline" size="sm" disabled={data.page >= data.pages} onClick={() => setPage((value) => value + 1)} aria-label="Next page">
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </nav>
          </div>
        )}
      </Card>

      <p className="text-xs text-slate-500">
        Amounts are demo data. Loan sanctions are recorded without a cash movement; disbursements and vendor payouts leave the system.{' '}
        <Link to="/admin/dashboard" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
          Back to dashboard
        </Link>
      </p>
    </div>
  );
}
