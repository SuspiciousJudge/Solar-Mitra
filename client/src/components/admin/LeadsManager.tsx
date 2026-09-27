import { ArrowDown, ArrowUp, ArrowUpDown, Check, ChevronLeft, ChevronRight, Eye, FilterX, Search, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState, ErrorState } from '@/components/shared/States';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { STATES } from '@/data/states';
import { useAsync } from '@/hooks/useAsync';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { NEXT_STATUS, useStatusUpdate } from '@/hooks/useStatusUpdate';
import { fetchLeads } from '@/services/leadService';
import { APPLICATION_STATUSES, type Application, type ApplicationStatus, type LeadSortField, type Paginated } from '@/types';
import { formatDate, formatINR } from '@/utils/format';
import { ConfirmDialog } from './ConfirmDialog';
import { StatusBadge } from './StatusBadge';

interface LeadsManagerProps {
  mode?: 'leads' | 'applications';
  compact?: boolean;
  pageSize?: number;
  /** Called after a status change succeeds (e.g. to refresh dashboard KPIs). */
  onStatusChanged?: () => void;
}

const COLUMNS: { label: string; sort?: LeadSortField; className?: string }[] = [
  { label: 'Application ID' },
  { label: 'Applicant', sort: 'applicantName' },
  { label: 'Location' },
  { label: 'System Size', sort: 'systemKW' },
  { label: 'Subsidy', sort: 'subsidy' },
  { label: 'Loan Amount', sort: 'loanAmount' },
  { label: 'Status', sort: 'status' },
  { label: 'Submitted', sort: 'createdAt' },
  { label: 'Action', className: 'text-right' },
];

export function LeadsManager({ mode = 'leads', compact = false, pageSize = 8, onStatusChanged }: LeadsManagerProps) {
  const [search, setSearch] = useState('');
  const [state, setState] = useState('');
  const [status, setStatus] = useState<ApplicationStatus | ''>('');
  const [sortBy, setSortBy] = useState<LeadSortField>('createdAt');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [rejecting, setRejecting] = useState<Application | null>(null);
  const debouncedSearch = useDebouncedValue(search);
  const { changeStatus: updateStatus, pendingId } = useStatusUpdate();
  const changeStatus: typeof updateStatus = async (...args) => {
    const ok = await updateStatus(...args);
    if (ok) onStatusChanged?.();
    return ok;
  };

  const query = useAsync<Paginated<Application>>(
    () =>
      fetchLeads({
        search: debouncedSearch || undefined,
        state: state || undefined,
        status: status || undefined,
        sortBy,
        order,
        page,
        limit: pageSize,
      }),
    [debouncedSearch, state, status, sortBy, order, page, pageSize],
  );

  const hasFilters = Boolean(search || state || status);
  const applyLocal = (id: string, next: ApplicationStatus) =>
    query.setData((prev) => (prev ? { ...prev, items: prev.items.map((item) => (item.id === id ? { ...item, status: next } : item)) } : prev));

  const toggleSort = (field: LeadSortField) => {
    if (sortBy === field) setOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    else {
      setSortBy(field);
      setOrder(field === 'applicantName' ? 'asc' : 'desc');
    }
    setPage(1);
  };

  const clearFilters = () => {
    setSearch('');
    setState('');
    setStatus('');
    setPage(1);
  };

  const data = query.data;

  return (
    <Card className="overflow-hidden">
      {!compact && (
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <label htmlFor={`${mode}-search`} className="sr-only">
              Search applications
            </label>
            <Input
              id={`${mode}-search`}
              placeholder="Search by name, ID, phone or location"
              prefix={<Search className="h-4 w-4" aria-hidden="true" />}
              className="h-11 text-sm"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:flex">
            <Select
              aria-label="Filter by state"
              className="h-11 text-sm sm:w-44"
              value={state}
              onChange={(e) => {
                setState(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All states</option>
              {STATES.filter((s) => s !== 'Other').map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Filter by status"
              className="h-11 text-sm sm:w-52"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as ApplicationStatus | '');
                setPage(1);
              }}
            >
              <option value="">All statuses</option>
              {APPLICATION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
          <Button variant="ghost" size="sm" onClick={clearFilters} disabled={!hasFilters} className="h-11">
            <FilterX className="h-4 w-4" aria-hidden="true" /> Clear filters
          </Button>
        </div>
      )}

      {query.error ? (
        <div className="p-6">
          <ErrorState message={query.error} onRetry={query.reload} />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                {COLUMNS.map((column) => (
                  <th
                    key={column.label}
                    scope="col"
                    className={`px-3 py-3 ${column.className ?? ''}`}
                    aria-sort={column.sort && sortBy === column.sort ? (order === 'asc' ? 'ascending' : 'descending') : undefined}
                  >
                    {column.sort && !compact ? (
                      <button type="button" onClick={() => toggleSort(column.sort!)} className="inline-flex items-center gap-1 uppercase hover:text-slate-800">
                        {column.label}
                        {sortBy === column.sort ? (
                          order === 'asc' ? <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" /> : <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : (
                          <ArrowUpDown className="h-3.5 w-3.5 opacity-40" aria-hidden="true" />
                        )}
                      </button>
                    ) : (
                      column.label
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {query.loading && !data
                ? Array.from({ length: compact ? 4 : 6 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={COLUMNS.length} className="px-4 py-3">
                        <Skeleton className="h-8 w-full" />
                      </td>
                    </tr>
                  ))
                : data?.items.map((app) => {
                    const pending = app.status === 'Pending Verification';
                    const next = NEXT_STATUS[app.status];
                    const busy = pendingId === app.id;
                    return (
                      <tr key={app.id} className="transition-colors hover:bg-slate-50/70">
                        <td className="whitespace-nowrap px-3 py-3 font-mono text-xs font-semibold text-slate-700">
                          {app.id}
                          {!app.isSeed && (
                            <Badge variant="yellow" className="mt-1 block w-fit font-sans">
                              New
                            </Badge>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-semibold text-slate-900">{app.applicantName}</p>
                          <p className="text-xs text-slate-500">{app.vendorName ?? app.vendorId}</p>
                        </td>
                        <td className="px-3 py-3 text-slate-600">{app.location}</td>
                        <td className="px-3 py-3 font-semibold tabular-nums">{app.systemKW} kW</td>
                        <td className="whitespace-nowrap px-3 py-3 tabular-nums text-forest-700">{formatINR(app.subsidy)}</td>
                        <td className="whitespace-nowrap px-3 py-3 font-semibold tabular-nums">{app.loanAmount > 0 ? formatINR(app.loanAmount) : <span className="text-slate-400">Upfront</span>}</td>
                        <td className="px-3 py-3">
                          <StatusBadge status={app.status} />
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-slate-500">{formatDate(app.createdAt)}</td>
                        <td className="px-3 py-3">
                          <div className="flex justify-end gap-1.5">
                            <Link to={`/admin/applications/${app.id}`} className={buttonVariants({ variant: 'ghost', size: 'sm' })} aria-label={`View ${app.applicantName}`} title="View details">
                              <Eye className="h-4 w-4" aria-hidden="true" /> <span className="hidden 2xl:inline">View</span>
                            </Link>
                            {mode === 'leads' || pending ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="subtle"
                                  disabled={!pending || busy}
                                  onClick={() => changeStatus(app, 'Approved', applyLocal)}
                                  aria-label={`Approve ${app.applicantName}`}
                                  title="Approve"
                                >
                                  <Check className="h-4 w-4" aria-hidden="true" /> <span className="hidden 2xl:inline">Approve</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-600 hover:bg-red-50"
                                  disabled={!pending || busy}
                                  onClick={() => setRejecting(app)}
                                  aria-label={`Reject ${app.applicantName}`}
                                  title="Reject"
                                >
                                  <X className="h-4 w-4" aria-hidden="true" /> <span className="hidden 2xl:inline">Reject</span>
                                </Button>
                              </>
                            ) : next ? (
                              <Button size="sm" variant="subtle" disabled={busy} onClick={() => changeStatus(app, next.status, applyLocal)}>
                                {next.label}
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
          {!query.loading && data && data.items.length === 0 && (
            <div className="p-6">
              <EmptyState
                title="No applications found"
                description={hasFilters ? 'Try a different search or clear the filters.' : 'New consumer applications will appear here.'}
                action={
                  hasFilters && (
                    <Button variant="outline" size="sm" onClick={clearFilters}>
                      Clear filters
                    </Button>
                  )
                }
              />
            </div>
          )}
        </div>
      )}

      {!compact && data && data.total > 0 && (
        <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-500 sm:flex-row">
          <p>
            Showing <strong className="text-slate-800">{(data.page - 1) * data.limit + 1}</strong>–
            <strong className="text-slate-800">{Math.min(data.page * data.limit, data.total)}</strong> of{' '}
            <strong className="text-slate-800">{data.total}</strong>
          </p>
          <nav className="flex items-center gap-2" aria-label="Pagination">
            <Button variant="outline" size="sm" disabled={data.page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous page">
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
            <span className="tabular-nums">
              Page {data.page} of {data.pages}
            </span>
            <Button variant="outline" size="sm" disabled={data.page >= data.pages} onClick={() => setPage((p) => p + 1)} aria-label="Next page">
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </nav>
        </div>
      )}

      <ConfirmDialog
        open={rejecting !== null}
        title="Reject this application?"
        description={rejecting ? `${rejecting.applicantName} (${rejecting.id}) will be marked as Rejected and notified by SMS.` : ''}
        confirmLabel="Reject application"
        onCancel={() => setRejecting(null)}
        onConfirm={() => {
          if (rejecting) void changeStatus(rejecting, 'Rejected', applyLocal);
          setRejecting(null);
        }}
      />
    </Card>
  );
}
