import { AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Eye, FilterX, Search, UserCheck, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { EmptyState, ErrorState } from '@/components/shared/States';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Input, Select } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/AuthContext';
import { useAsync } from '@/hooks/useAsync';
import { useOperatorFilters, type OperatorFiltersApi } from '@/hooks/useOperatorFilters';
import { ACTION_LABELS, nextActionsFor, useStatusUpdate } from '@/hooks/useStatusUpdate';
import { getErrorMessage } from '@/services/api';
import { assignLead, fetchLeads } from '@/services/leadService';
import { REJECTION_REASONS, type ApplicationStatus, type ApplicationView, type LeadSortField, type Paginated, type RejectionReason } from '@/types';
import { formatWaiting } from '@/utils/ageing';
import { formatDate, formatINR } from '@/utils/format';
import { cn } from '@/utils/cn';

interface LeadsManagerProps {
  mode?: 'leads' | 'applications';
  compact?: boolean;
  pageSize?: number;
  /** Called after a status change succeeds (e.g. to refresh dashboard KPIs). */
  onStatusChanged?: () => void;
  /** Share the page's filter bar instead of owning a private one. */
  filters?: OperatorFiltersApi;
}

const COLUMNS: { label: string; sort?: LeadSortField; className?: string }[] = [
  { label: 'Application' },
  { label: 'Applicant', sort: 'applicantName' },
  { label: 'Location' },
  { label: 'System', sort: 'systemKW' },
  { label: 'Subsidy', sort: 'subsidy' },
  { label: 'Loan / EMI', sort: 'loanAmount' },
  { label: 'Status', sort: 'status' },
  { label: 'Ageing' },
  { label: 'Owner' },
  { label: 'Submitted', sort: 'createdAt' },
  { label: 'Actions', className: 'text-right' },
];

export function LeadsManager({ mode = 'leads', compact = false, pageSize = 8, onStatusChanged, filters: externalFilters }: LeadsManagerProps) {
  const ownFilters = useOperatorFilters();
  const filters = externalFilters ?? ownFilters;
  const { user } = useAuth();
  const [sortBy, setSortBy] = useState<LeadSortField>('createdAt');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [rejecting, setRejecting] = useState<ApplicationView | null>(null);
  const [reason, setReason] = useState<RejectionReason>('Incomplete documents');
  const [note, setNote] = useState('');
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const { changeStatus, pendingId } = useStatusUpdate(mode === 'applications' ? 'applications' : 'leads');

  const query = useAsync<Paginated<ApplicationView>>(
    () =>
      fetchLeads({
        ...filters.filters,
        sortBy,
        order,
        page,
        limit: pageSize,
      } as never),
    [JSON.stringify(filters.queryParams), sortBy, order, page, pageSize],
  );

  const applyLocal = (id: string, next: ApplicationStatus) =>
    query.setData((prev) => (prev ? { ...prev, items: prev.items.map((item) => (item.id === id ? { ...item, status: next } : item)) } : prev));

  const toggleSort = (field: LeadSortField) => {
    if (sortBy === field) setOrder((value) => (value === 'asc' ? 'desc' : 'asc'));
    else {
      setSortBy(field);
      setOrder(field === 'applicantName' ? 'asc' : 'desc');
    }
    setPage(1);
  };

  const runStatus = async (application: ApplicationView, status: ApplicationStatus, options: { reason?: RejectionReason; note?: string } = {}) => {
    const ok = await changeStatus(application, status, applyLocal, options);
    if (ok) {
      onStatusChanged?.();
      query.reload();
    }
  };

  const assignToMe = async (application: ApplicationView) => {
    setAssigningId(application.id);
    try {
      const updated = await assignLead(application.id, { assignToMe: true });
      query.setData((prev) => (prev ? { ...prev, items: prev.items.map((item) => (item.id === application.id ? { ...item, assignedTo: updated.assignedTo } : item)) } : prev));
      toast.success(`${application.applicantName} assigned to you`);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not assign this lead.'));
    } finally {
      setAssigningId(null);
    }
  };

  const hasFilters = filters.activeCount > 0;
  const data = query.data;

  return (
    <Card className="overflow-hidden">
      {!compact && hasFilters && (
        <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-4 py-2 text-xs font-semibold text-slate-500">
          <Search className="h-3.5 w-3.5" aria-hidden="true" />
          Filtered view · {filters.activeCount} filter{filters.activeCount === 1 ? '' : 's'} applied
          <Button variant="ghost" size="sm" className="ml-auto h-7 text-xs" onClick={filters.reset}>
            <FilterX className="h-3.5 w-3.5" aria-hidden="true" /> Clear
          </Button>
        </div>
      )}

      {query.error ? (
        <div className="p-6">
          <ErrorState message={query.error} onRetry={query.reload} />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-left text-sm">
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
                ? Array.from({ length: compact ? 4 : 6 }).map((_, index) => (
                    <tr key={index}>
                      <td colSpan={COLUMNS.length} className="px-4 py-3">
                        <Skeleton className="h-8 w-full" />
                      </td>
                    </tr>
                  ))
                : data?.items.map((application) => {
                    const actions = nextActionsFor(application, user?.role);
                    const busy = pendingId === application.id;
                    const duplicate = application.duplicates?.[0];
                    return (
                      <tr key={application.id} className="transition-colors hover:bg-slate-50/70">
                        <td className="whitespace-nowrap px-3 py-3">
                          <p className="font-mono text-xs font-semibold text-slate-700">{application.id}</p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {!application.isSeed && <Badge variant="yellow">New</Badge>}
                            {duplicate && (
                              <Badge variant="red" title={`Matches ${duplicate.applicationId} on ${duplicate.matchedOn}`}>
                                <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                                Duplicate
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-semibold text-slate-900">{application.applicantName}</p>
                          <p className="text-xs text-slate-500">{application.phone}</p>
                        </td>
                        <td className="px-3 py-3 text-slate-600">
                          <p>{application.district ?? '—'}</p>
                          <p className="text-xs text-slate-500">{application.state}</p>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 font-semibold tabular-nums">{application.systemKW} kW</td>
                        <td className="whitespace-nowrap px-3 py-3 tabular-nums text-forest-700">{formatINR(application.subsidy)}</td>
                        <td className="whitespace-nowrap px-3 py-3 tabular-nums">
                          {application.loanAmount > 0 ? (
                            <>
                              <p className="font-semibold">{formatINR(application.loanAmount)}</p>
                              <p className="text-xs text-slate-500">EMI {formatINR(application.emi)}</p>
                            </>
                          ) : (
                            <span className="text-slate-400">Upfront · {formatINR(application.netCost)}</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <StatusBadge status={application.status} />
                          <p className="mt-1 text-xs text-slate-500">Updated {formatDate(application.updatedAt)}</p>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3">
                          <span className={cn('font-semibold tabular-nums', application.ageing?.slaBreached ? 'text-red-600' : 'text-slate-600')}>
                            {application.ageing?.waitingLabel ?? formatWaiting(0)}
                          </span>
                          {application.ageing?.slaBreached && (
                            <p className="text-xs font-semibold text-red-600">
                              SLA breached ({application.ageing.slaHours}h)
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-3 text-slate-600">
                          {application.assignedTo ? (
                            <span className="whitespace-nowrap text-sm font-semibold">{application.assignedTo.name}</span>
                          ) : (
                            <Button variant="ghost" size="sm" className="h-8 text-xs" loading={assigningId === application.id} onClick={() => assignToMe(application)}>
                              {assigningId !== application.id && <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />} Assign to me
                            </Button>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-slate-500">{formatDate(application.createdAt)}</td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap justify-end gap-1.5">
                            <Link to={`/admin/applications/${application.id}`} className={buttonVariants({ variant: 'ghost', size: 'sm' })} aria-label={`View ${application.applicantName}`} title="View details">
                              <Eye className="h-4 w-4" aria-hidden="true" /> <span className="hidden 2xl:inline">View</span>
                            </Link>
                            {actions.map((status) => (
                              <Button
                                key={status}
                                size="sm"
                                variant={status === 'Rejected' ? 'ghost' : 'subtle'}
                                className={status === 'Rejected' ? 'text-red-600 hover:bg-red-50' : undefined}
                                disabled={busy}
                                onClick={() => (status === 'Rejected' ? (setRejecting(application), setReason('Incomplete documents'), setNote('')) : runStatus(application, status))}
                                aria-label={`${ACTION_LABELS[status] ?? status} for ${application.applicantName}`}
                                title={ACTION_LABELS[status] ?? status}
                              >
                                <span className="hidden 2xl:inline">{ACTION_LABELS[status] ?? status}</span>
                                <span className="2xl:hidden">{status === 'Rejected' ? 'Reject' : ACTION_LABELS[status] ?? status}</span>
                              </Button>
                            ))}
                            {actions.length === 0 && <span className="text-xs text-slate-400">{application.status === 'Completed' ? 'Closed' : 'No action for your role'}</span>}
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

      {!compact && data && data.total > 0 && (
        <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-500 sm:flex-row">
          <p>
            Showing <strong className="text-slate-800">{(data.page - 1) * data.limit + 1}</strong>–
            <strong className="text-slate-800">{Math.min(data.page * data.limit, data.total)}</strong> of <strong className="text-slate-800">{data.total}</strong>
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

      <Dialog
        open={rejecting !== null}
        onClose={() => setRejecting(null)}
        title="Reject this application?"
        description={rejecting ? `${rejecting.applicantName} (${rejecting.id}) will be marked as Rejected. A reason is mandatory.` : ''}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setRejecting(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={reason === 'Other' && !note.trim()}
              onClick={() => {
                if (rejecting) void runStatus(rejecting, 'Rejected', { reason, note: note.trim() || undefined });
                setRejecting(null);
              }}
            >
              Reject application
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <label htmlFor="rejection-reason" className="mb-1.5 block text-sm font-semibold text-slate-700">
              Reason
            </label>
            <Select id="rejection-reason" value={reason} onChange={(event) => setReason(event.target.value as RejectionReason)}>
              {REJECTION_REASONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label htmlFor="rejection-note" className="mb-1.5 block text-sm font-semibold text-slate-700">
              Note for the audit trail {reason === 'Other' && <span className="text-red-600">(required)</span>}
            </label>
            <Input id="rejection-note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="e.g. roof photos missing" maxLength={300} />
          </div>
          <p className="flex items-start gap-2 rounded-2xl bg-slate-50 p-3 text-xs text-slate-600">
            <UserCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Rejections are recorded against your name ({user?.name ?? 'operator'}) in the application timeline.
          </p>
        </div>
      </Dialog>
    </Card>
  );
}
