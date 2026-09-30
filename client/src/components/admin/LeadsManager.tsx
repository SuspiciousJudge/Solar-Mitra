import { AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Clock, Eye, FilterX, Search, UserCheck, UserPlus } from 'lucide-react';
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
import { SLA_HOURS, formatWaiting } from '@/utils/ageing';
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

interface HeaderLine {
  label: string;
  /** Sortable lines render as a sort button; the others are plain labels. */
  sort?: LeadSortField;
  hint?: string;
}

interface Column {
  key: string;
  /** One or two stacked header lines: a merged column lists every field it holds. */
  lines: HeaderLine[];
  /** Tailwind width classes for the <col>. A column with no width at a breakpoint takes whatever room is left there (Applicant below 2xl). */
  width?: string;
  /** Stays pinned to the right edge when the table has to scroll sideways. */
  sticky?: boolean;
}

/**
 * Seven columns instead of eleven, so the table fits a 1280px laptop without sideways scrolling.
 * Nothing was dropped: submitted date sits under the application ID, phone and location under
 * the applicant, subsidy + loan/EMI share one Finance column and the waiting time sits under the
 * status. Below 2xl the widths are fixed pixels sized from real label measurements and only Applicant
 * flexes, so nothing can squeeze below what it needs. From 2xl up (cards of 1200px+) every column
 * grows in proportion instead (the shares add up to 100%, and each stays above its minimum).
 */
const COLUMNS: Column[] = [
  { key: 'application', lines: [{ label: 'Application' }, { label: 'Submitted', sort: 'createdAt', hint: 'Sort by submitted date' }], width: 'w-[112px] 2xl:w-[10.5%]' },
  { key: 'applicant', lines: [{ label: 'Applicant', sort: 'applicantName' }, { label: 'Location' }], width: '2xl:w-[25%]' },
  { key: 'system', lines: [{ label: 'System', sort: 'systemKW' }], width: 'w-[84px] 2xl:w-[8%]' },
  { key: 'finance', lines: [{ label: 'Subsidy', sort: 'subsidy' }, { label: 'Loan / EMI', sort: 'loanAmount' }], width: 'w-[128px] 2xl:w-[12%]' },
  { key: 'status', lines: [{ label: 'Status', sort: 'status' }, { label: 'Ageing' }], width: 'w-[200px] 2xl:w-[17%]' },
  { key: 'owner', lines: [{ label: 'Owner' }], width: 'w-[112px] 2xl:w-[10.5%]' },
  { key: 'actions', lines: [{ label: 'Actions' }], width: 'w-[192px] 2xl:w-[17%]', sticky: true },
];

/** Shared by header and body cells: 8px between columns, a little more at the outer edges so text clears the card's rounded corners. */
const CELL = 'px-2 py-2.5 align-middle first:pl-4 last:pr-3 2xl:px-3 2xl:first:pl-5 2xl:last:pr-4';
/** Pins the Actions column to the right edge from md up (on phones the table just scrolls); the soft edge only shows below xl, where the table can actually scroll. */
const STICKY = 'md:sticky md:right-0 md:z-[1] md:max-xl:shadow-[-10px_0_10px_-10px_rgba(15,23,42,0.14)]';

/**
 * Button text for the dense table. The full wording stays in the tooltip and aria-label; only the
 * label that would not fit next to the View button is shortened.
 */
const TABLE_ACTION_LABELS: Partial<Record<ApplicationStatus, string>> = {
  'Net Meter Commissioned': 'Net meter',
};

function FinanceLine({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-1">
      <dt className="text-[11px] font-medium leading-4 text-slate-500">{label}</dt>
      <dd className={cn('whitespace-nowrap text-xs leading-4 tabular-nums', valueClassName)}>{value}</dd>
    </div>
  );
}

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
    <Card className="min-w-0 overflow-hidden">
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
        <div className="relative overflow-x-auto">
          {/* `relative` keeps absolutely positioned content (the sr-only labels) inside this scroller so it can never widen the page. */}
          <table className="w-full min-w-[940px] table-fixed text-left text-sm">
            <colgroup>
              {COLUMNS.map((column) => (
                <col key={column.key} className={column.width} />
              ))}
            </colgroup>
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                {COLUMNS.map((column) => {
                  const activeSort = column.lines.some((line) => line.sort === sortBy);
                  return (
                    <th
                      key={column.key}
                      scope="col"
                      className={cn(CELL, column.sticky && cn(STICKY, 'bg-slate-50'))}
                      aria-sort={activeSort ? (order === 'asc' ? 'ascending' : 'descending') : undefined}
                    >
                      <div className="flex flex-col items-start gap-0.5">
                        {column.lines.map((line) =>
                          line.sort && !compact ? (
                            <button
                              key={line.label}
                              type="button"
                              onClick={() => toggleSort(line.sort!)}
                              title={line.hint ?? `Sort by ${line.label.toLowerCase()}`}
                              className="inline-flex items-center gap-1 whitespace-nowrap uppercase hover:text-slate-800"
                            >
                              {line.label}
                              {sortBy === line.sort ? (
                                order === 'asc' ? <ArrowUp className="h-3 w-3" aria-hidden="true" /> : <ArrowDown className="h-3 w-3" aria-hidden="true" />
                              ) : (
                                <ArrowUpDown className="h-3 w-3 opacity-40" aria-hidden="true" />
                              )}
                            </button>
                          ) : (
                            <span key={line.label} className="whitespace-nowrap">
                              {line.label}
                            </span>
                          ),
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {query.loading && !data
                ? Array.from({ length: compact ? 4 : 6 }).map((_, index) => (
                    <tr key={index}>
                      <td colSpan={COLUMNS.length} className="px-4 py-3">
                        <Skeleton className="h-10 w-full" />
                      </td>
                    </tr>
                  ))
                : data?.items.map((application) => {
                    const actions = nextActionsFor(application, user?.role);
                    const busy = pendingId === application.id;
                    const duplicate = application.duplicates?.[0];
                    const location = [application.district, application.state].filter(Boolean).join(', ');
                    const slaBreached = Boolean(application.ageing?.slaBreached);
                    const waiting = application.ageing?.waitingLabel ?? formatWaiting(0);
                    const closed = application.status === 'Completed' || application.status === 'Rejected';
                    return (
                      <tr key={application.id} className="group transition-colors hover:bg-slate-50/70">
                        <td className={CELL}>
                          <p className="whitespace-nowrap font-mono text-xs font-semibold text-slate-700">{application.id}</p>
                          <p className="mt-0.5 whitespace-nowrap text-xs text-slate-500">{formatDate(application.createdAt)}</p>
                          {(!application.isSeed || duplicate) && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {!application.isSeed && <Badge variant="yellow">New</Badge>}
                              {duplicate && (
                                <Badge variant="red" title={`Matches ${duplicate.applicationId} on ${duplicate.matchedOn}`}>
                                  <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                                  Duplicate
                                </Badge>
                              )}
                            </div>
                          )}
                        </td>
                        <td className={CELL}>
                          <p className="truncate text-[13px] font-semibold leading-[18px] text-slate-900" title={application.applicantName}>
                            {application.applicantName}
                          </p>
                          <p className="truncate text-xs tabular-nums text-slate-500">{application.phone}</p>
                          <p className="truncate text-xs text-slate-500" title={location}>
                            {location || '—'}
                          </p>
                        </td>
                        <td className={cn(CELL, 'whitespace-nowrap font-semibold tabular-nums')}>{application.systemKW} kW</td>
                        <td className={CELL}>
                          <dl className="space-y-0.5">
                            <FinanceLine label="Subsidy" value={formatINR(application.subsidy)} valueClassName="font-semibold text-forest-700" />
                            {application.loanAmount > 0 ? (
                              <>
                                <FinanceLine label="Loan" value={formatINR(application.loanAmount)} valueClassName="font-semibold text-slate-900" />
                                <FinanceLine label="EMI" value={formatINR(application.emi)} valueClassName="text-slate-600" />
                              </>
                            ) : (
                              <FinanceLine label="Upfront" value={formatINR(application.netCost)} valueClassName="font-semibold text-slate-900" />
                            )}
                          </dl>
                        </td>
                        <td className={CELL}>
                          <StatusBadge status={application.status} className="px-2" />
                          <p
                            className={cn('mt-1 flex items-center gap-1 text-xs', slaBreached ? 'font-semibold text-red-600' : 'text-slate-500')}
                            title={
                              slaBreached
                                ? `SLA breached: pending verification for more than ${application.ageing?.slaHours ?? SLA_HOURS}h · last updated ${formatDate(application.updatedAt)}`
                                : `Waiting since the last update · ${formatDate(application.updatedAt)}`
                            }
                          >
                            <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
                            <span className="sr-only">Waiting </span>
                            <span className="truncate tabular-nums">
                              {waiting}
                              {slaBreached && ' · SLA breached'}
                            </span>
                          </p>
                        </td>
                        <td className={CELL}>
                          {application.assignedTo ? (
                            <p className="line-clamp-2 break-words text-xs font-semibold leading-4 text-slate-700" title={application.assignedTo.name}>
                              {application.assignedTo.name}
                            </p>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="-ml-2 h-8 px-2 text-xs"
                              loading={assigningId === application.id}
                              onClick={() => assignToMe(application)}
                              title="Assign to me"
                              aria-label={`Assign ${application.applicantName} to me`}
                            >
                              {assigningId !== application.id && <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />} Assign
                            </Button>
                          )}
                        </td>
                        <td className={cn(CELL, STICKY, 'bg-white group-hover:bg-slate-50')}>
                          <div className="flex items-center gap-1">
                            <Link
                              to={`/admin/applications/${application.id}`}
                              className={buttonVariants({ variant: 'ghost', size: 'icon', className: 'h-8 w-8 shrink-0 rounded-lg' })}
                              aria-label={`View ${application.applicantName}`}
                              title="View details"
                            >
                              <Eye className="h-4 w-4" aria-hidden="true" />
                            </Link>
                            {actions.map((status) => (
                              <Button
                                key={status}
                                size="sm"
                                variant={status === 'Rejected' ? 'ghost' : 'subtle'}
                                className={cn('h-8 shrink-0 whitespace-nowrap px-2.5 text-xs', status === 'Rejected' && 'text-red-600 hover:bg-red-50')}
                                disabled={busy}
                                onClick={() => (status === 'Rejected' ? (setRejecting(application), setReason('Incomplete documents'), setNote('')) : runStatus(application, status))}
                                aria-label={`${ACTION_LABELS[status] ?? status} for ${application.applicantName}`}
                                title={ACTION_LABELS[status] ?? status}
                              >
                                {TABLE_ACTION_LABELS[status] ?? ACTION_LABELS[status] ?? status}
                              </Button>
                            ))}
                            {actions.length === 0 && (
                              <span className="whitespace-nowrap text-xs text-slate-500" title={closed ? 'This file is closed' : 'Your role cannot take the next step'}>
                                {closed ? 'Closed' : 'View only'}
                              </span>
                            )}
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
