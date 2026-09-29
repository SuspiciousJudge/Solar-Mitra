import { ArrowLeft, BadgeCheck, Banknote, CircleCheckBig, Clock, IndianRupee, MapPin, Phone, ShieldCheck, Star, TrendingUp, User, UserPlus, Zap } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { SchemeChips } from '@/components/admin/SchemeChips';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { Disclaimer } from '@/components/shared/Disclaimer';
import { EmptyState, ErrorState } from '@/components/shared/States';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Input, Select } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/AuthContext';
import { useAsync } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { ACTION_LABELS, nextActionsFor, useStatusUpdate } from '@/hooks/useStatusUpdate';
import { getErrorMessage } from '@/services/api';
import { assignApplication, fetchApplication } from '@/services/applicationService';
import { fetchTransactions } from '@/services/transactionService';
import { REJECTION_REASONS, type ApplicationStatus, type RejectionReason } from '@/types';
import { formatDate, formatINR, formatNumber } from '@/utils/format';
import { calculateCO2Impact } from '@/utils/solarCalculator';

function Section({ title, icon, children, action }: { title: string; icon: ReactNode; children: ReactNode; action?: ReactNode }) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-bold text-slate-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-forest-50 text-forest-700">{icon}</span>
          {title}
        </h2>
        {action}
      </div>
      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">{children}</dl>
    </Card>
  );
}

function Item({ label, value, strong }: { label: string; value: ReactNode; strong?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className={strong ? 'mt-0.5 text-lg font-extrabold tabular-nums text-slate-900' : 'mt-0.5 font-semibold tabular-nums text-slate-800'}>{value}</dd>
    </div>
  );
}

export function ApplicationDetailPage() {
  const { id = '' } = useParams();
  useDocumentTitle(id);
  const { user } = useAuth();
  const query = useAsync(() => fetchApplication(id), [id]);
  const { changeStatus, pendingId } = useStatusUpdate();
  const [confirmReject, setConfirmReject] = useState(false);
  const [showDateOfBirth, setShowDateOfBirth] = useState(false);
  const trail = useAsync(() => fetchTransactions({ search: id, limit: 50 }), [id]);
  const { changeStatus, pendingId } = useStatusUpdate('applications');
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState<RejectionReason>('Incomplete documents');
  const [note, setNote] = useState('');
  const [assigning, setAssigning] = useState(false);
  const app = query.data;

  const apply = (_id: string, status: ApplicationStatus) =>
    query.setData((prev) =>
      prev
        ? {
            ...prev,
            status,
            timeline: prev.status === status ? prev.timeline : [...prev.timeline, { status, note: 'Updated by operator', at: new Date().toISOString(), byName: user?.name }],
          }
        : prev,
    );

  const update = async (status: ApplicationStatus, options: { reason?: RejectionReason; note?: string } = {}) => {
    if (!app) return;
    const ok = await changeStatus(app, status, apply, options);
    if (ok) {
      query.reload();
      trail.reload();
    }
  };

  const assignToMe = async () => {
    if (!app) return;
    setAssigning(true);
    try {
      const updated = await assignApplication(app.id, { assignToMe: true });
      query.setData((prev) => (prev ? { ...prev, assignedTo: updated.assignedTo } : prev));
      toast.success(`${app.applicantName} assigned to you`);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not assign this application.'));
    } finally {
      setAssigning(false);
    }
  };

  if (query.loading && !app) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-64 rounded-3xl lg:col-span-2" />
          <Skeleton className="h-64 rounded-3xl" />
        </div>
      </div>
    );
  }
  if (query.error) {
    return query.error.toLowerCase().includes('not found') ? (
      <EmptyState
        title="Application not found"
        description={`We couldn't find ${id}. It may have been removed by a demo reset.`}
        action={
          <Link to="/admin/leads" className={buttonVariants({ size: 'sm' })}>
            Back to leads
          </Link>
        }
      />
    ) : (
      <ErrorState message={query.error} onRetry={query.reload} />
    );
  }
  if (!app) return null;

  const actions = nextActionsFor(app, user?.role);
  const busy = pendingId === app.id;
  const impact = calculateCO2Impact(app.systemKW);
  const duplicate = app.duplicates?.[0];
  const repayment = app.repayment;
  const onTimePercent = repayment && repayment.emisDue > 0 ? Math.round((repayment.paidOnTime / repayment.emisDue) * 1000) / 10 : null;

  return (
    <div className="space-y-6">
      <Link to="/admin/leads" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to leads
      </Link>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">{app.applicantName}</h1>
            <StatusBadge status={app.status} />
            {!app.isSeed && <Badge variant="yellow">New from consumer app</Badge>}
            {duplicate && (
              <Badge variant="red" title={`Matches ${duplicate.applicationId} on ${duplicate.matchedOn}: ${duplicate.value}`}>
                Possible duplicate · {duplicate.applicationId}
              </Badge>
            )}
          </div>
          <p className="mt-1 font-mono text-sm text-slate-500">
            {app.id} · submitted {formatDate(app.createdAt, true)} · updated {formatDate(app.updatedAt, true)}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <User className="h-4 w-4 text-slate-400" aria-hidden="true" />
              {app.assignedTo ? `Owner: ${app.assignedTo.name}` : 'Unassigned'}
            </span>
            {app.ageing && (
              <span className={`inline-flex items-center gap-1.5 font-semibold ${app.ageing.slaBreached ? 'text-red-600' : 'text-slate-600'}`}>
                <Clock className="h-4 w-4" aria-hidden="true" />
                Waiting {app.ageing.waitingLabel}
                {app.ageing.slaBreached && ` · SLA ${app.ageing.slaHours}h breached`}
              </span>
            )}
            {!app.assignedTo && (
              <Button variant="outline" size="sm" className="h-8" loading={assigning} onClick={assignToMe}>
                {!assigning && <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />} Assign to me
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {actions.map((status) => (
            <Button
              key={status}
              variant={status === 'Rejected' ? 'outline' : 'primary'}
              className={status === 'Rejected' ? 'text-red-600' : undefined}
              loading={busy}
              onClick={() => (status === 'Rejected' ? (setRejecting(true), setNote('')) : update(status))}
            >
              {!busy && status === 'Completed' && <CircleCheckBig className="h-4 w-4" aria-hidden="true" />}
              {status === 'Rejected' ? 'Reject' : ACTION_LABELS[status] ?? status}
            </Button>
          ))}
          {actions.length === 0 && <p className="text-sm text-slate-500">No action available for your role at this stage.</p>}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Section
            title="Scheme stack"
            icon={<Banknote className="h-4 w-4" aria-hidden="true" />}
            action={<span className="text-xs font-semibold text-slate-500">Total support {formatINR(app.subsidy)}</span>}
          >
            <div className="sm:col-span-2">
              <SchemeChips schemeIds={app.schemeIds} />
              <p className="mt-2 text-xs text-slate-500">
                Central {formatINR(app.centralSubsidy)} · State {formatINR(app.stateSubsidy)} · Market cost {formatINR(app.marketCost)} → net {formatINR(app.netCost)}
              </p>
            </div>
          </Section>

          <Section title="Applicant" icon={<User className="h-4 w-4" aria-hidden="true" />}>
            <Item label="Name" value={app.applicantName} />
            <Item label="Phone" value={<span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />+91 {app.phone}</span>} />
            <Item label="Location" value={<span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />{app.location}</span>} />
            <Item label="State" value={app.state} />
            {app.journey?.personal?.email && <Item label="Email" value={app.journey.personal.email} />}
            {app.journey?.personal?.alternateMobile && <Item label="Alternate phone" value={app.journey.personal.alternateMobile} />}
            {app.journey?.personal?.dateOfBirth && <Item label="Date of birth" value={<button type="button" className="underline decoration-dotted" onClick={() => setShowDateOfBirth((shown) => !shown)}>{showDateOfBirth ? app.journey.personal.dateOfBirth : '•••••••• (show)'}</button>} />}
          </Section>
          {app.journey?.electricity && <Section title="Electricity connection" icon={<Zap className="h-4 w-4" aria-hidden="true" />}>
            <Item label="Consumer name" value={app.journey.electricity.consumerName || '—'} />
            <Item label="Consumer number" value={app.journey.electricity.consumerNumber || '—'} />
            <Item label="DISCOM" value={app.journey.electricity.discom || '—'} />
            <Item label="Meter / connection" value={[app.journey.electricity.meterNumber, app.journey.electricity.connectionType].filter(Boolean).join(' · ') || '—'} />
            <Item label="Sanctioned load" value={app.journey.electricity.sanctionedLoad || '—'} />
            <Item label="Billing period" value={app.journey.electricity.billingPeriod || '—'} />
          </Section>}
          {app.journey?.kyc && <Section title="KYC" icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />}>
            <Item label="Document type" value={app.journey.kyc.documentType || '—'} />
            <Item label="Document status" value={app.journey.kyc.documentStatus === 'demo-collection-only' ? 'Demo collection only · not verified' : 'Not verified'} />
          </Section>}
          {app.journey?.property && <Section title="Property & installation" icon={<MapPin className="h-4 w-4" aria-hidden="true" />}>
            <Item label="Ownership" value={app.journey.property.ownership || '—'} />
            <Item label="Address" value={[app.journey.property.addressLine1, app.journey.property.addressLine2, app.journey.property.city, app.journey.property.district, app.journey.property.state, app.journey.property.pinCode].filter(Boolean).join(', ')} />
            <Item label="Roof type" value={app.journey.property.roofType || '—'} />
            <Item label="Roof area" value={app.journey.property.roofArea ? `${formatNumber(app.journey.property.roofArea)} sq ft` : 'Not provided'} />
            <Item label="Shading" value={app.journey.property.shaded || '—'} />
            <Item label="Installation permission" value={app.journey.property.permission ? 'Confirmed' : 'Not confirmed'} />
          </Section>}
          {app.journey?.solar && <Section title="Solar preferences" icon={<Zap className="h-4 w-4" aria-hidden="true" />}>
            <Item label="Battery preference" value={app.journey.solar.batteryPreference || '—'} />
            <Item label="Payment preference" value={app.journey.solar.paymentPreference || '—'} />
          </Section>}
          <Section title="Energy profile" icon={<Zap className="h-4 w-4" aria-hidden="true" />}>
            <Item label="Monthly units" value={`${formatNumber(app.monthlyUnits)} kWh`} />
            <Item label="Monthly bill" value={app.monthlyBill > 0 ? formatINR(app.monthlyBill) : 'Not provided'} />
            <Item label="Recommended system" value={`${app.systemKW} kW`} strong />
            <Item label="Estimated climate impact" value={`${formatNumber(impact.estimatedCO2OffsetTonnes)} t CO₂/yr`} />
          </Section>

          <Section title="Financial profile" icon={<IndianRupee className="h-4 w-4" aria-hidden="true" />}>
            <Item label="Net cost to household" value={formatINR(app.netCost)} strong />
            <Item label="Loan amount" value={app.loanAmount > 0 ? formatINR(app.loanAmount) : 'Paying upfront'} strong />
            <Item label="EMI" value={app.loanAmount > 0 ? `${formatINR(app.emi)}/month · ${app.tenureMonths} mo @ ${app.interestRate}%` : '—'} />
            <Item label="Payment mode" value={app.paymentMode === 'loan' ? 'Financed' : 'Upfront'} />
          </Section>

          {repayment && (
            <Section title="Repayment health" icon={<TrendingUp className="h-4 w-4" aria-hidden="true" />}>
              <Item label="EMIs due" value={formatNumber(repayment.emisDue)} />
              <Item label="Paid on time" value={`${formatNumber(repayment.paidOnTime)}${onTimePercent !== null ? ` (${onTimePercent}%)` : ''}`} />
              <Item label="Paid late" value={formatNumber(repayment.paidLate)} />
              <Item label="30+ DPD" value={formatNumber(repayment.paid30PlusDpd)} />
              <Item label="Outstanding principal" value={formatINR(repayment.outstandingPrincipal)} strong />
            </Section>
          )}

          <Section title="Money trail" icon={<Banknote className="h-4 w-4" aria-hidden="true" />}>
            <div className="sm:col-span-2">
              {trail.loading && !trail.data ? (
                <Skeleton className="h-24 w-full" />
              ) : (trail.data?.items.length ?? 0) === 0 ? (
                <p className="text-sm text-slate-500">No transactions recorded yet. Loan disbursements, EMIs and subsidy movements will appear here.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {trail.data?.items.map((transaction) => (
                    <li key={transaction.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{transaction.kind}</p>
                        <p className="text-xs text-slate-500">
                          {formatDate(transaction.at, true)} · {transaction.byName} · <span className="font-mono">{transaction.id}</span>
                          {transaction.dpd !== undefined && transaction.dpd > 0 && ` · ${transaction.dpd} DPD`}
                        </p>
                      </div>
                      <span className={transaction.direction === 'outflow' ? 'font-bold tabular-nums text-red-700' : 'font-bold tabular-nums text-forest-700'}>
                        {transaction.direction === 'outflow' ? '−' : '+'} {formatINR(transaction.amountINR)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Section>
          {app.journey?.booking && <Section title="Installer booking" icon={<CalendarCheck className="h-4 w-4" aria-hidden="true" />}>
            <Item label="Preferred date" value={app.journey.booking.preferredDate || '—'} />
            <Item label="Preferred time" value={app.journey.booking.preferredTime || '—'} />
            <Item label="Customer note" value={app.journey.booking.note || '—'} />
            <Item label="Consents recorded" value={app.journey.booking.consentGiven ? 'Yes' : 'No'} />
          </Section>}

          <Disclaimer>
            Illustrative financing calculation. Final loan eligibility, interest rate, tenure, subsidy eligibility, and repayment terms are subject to applicable policies and lender approval. Subsidy values use demo policy assumptions.
          </Disclaimer>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="mb-4 font-bold text-slate-900">Vendor</h2>
            {app.vendor ? (
              <div className="space-y-3">
                <p className="text-lg font-bold text-slate-900">{app.vendor.name}</p>
                <p className="text-sm text-slate-500">{app.vendor.location}</p>
                <div className="flex flex-wrap gap-3 text-sm">
                  <span className="inline-flex items-center gap-1 font-semibold">
                    <Star className="h-4 w-4 fill-solar-400 text-solar-400" aria-hidden="true" /> {app.vendor.rating.toFixed(1)}
                  </span>
                  <span className="inline-flex items-center gap-1 text-slate-600">
                    <MapPin className="h-4 w-4" aria-hidden="true" /> {app.vendor.distanceKm} km
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {app.vendor.empanelled ? (
                    <Badge variant="green">
                      <ShieldCheck className="h-3 w-3" aria-hidden="true" /> MNRE Empanelled
                    </Badge>
                  ) : (
                    <Badge variant="red">Not empanelled</Badge>
                  )}
                  {app.vendor.verified ? (
                    <Badge variant="blue">
                      <BadgeCheck className="h-3 w-3" aria-hidden="true" /> Verified
                    </Badge>
                  ) : (
                    <Badge variant="gray">Unverified</Badge>
                  )}
                  {!app.vendor.active && <Badge variant="gray">Inactive</Badge>}
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Vendor {app.vendorId} is no longer listed.</p>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="mb-4 font-bold text-slate-900">Application timeline</h2>
            <ol className="relative space-y-5 border-l-2 border-slate-100 pl-5">
              {app.timeline.map((event, index) => (
                <li key={`${event.at}-${index}`} className="relative">
                  <span
                    className={`absolute -left-[27px] top-1 h-3 w-3 rounded-full ring-4 ring-white ${event.status === 'Rejected' ? 'bg-red-500' : index === app.timeline.length - 1 ? 'bg-solar-400' : 'bg-forest-500'}`}
                    aria-hidden="true"
                  />
                  <p className="text-sm font-bold text-slate-900">{event.status}</p>
                  <p className="text-xs text-slate-500">{event.note}</p>
                  {(event.byName || event.reason) && (
                    <p className="text-xs font-semibold text-slate-500">
                      {event.byName ?? 'System'}
                      {event.role ? ` · ${event.role}` : ''}
                      {event.reason ? ` · ${event.reason}` : ''}
                    </p>
                  )}
                  <time className="text-xs text-slate-400" dateTime={event.at}>
                    {formatDate(event.at, true)}
                  </time>
                </li>
              ))}
              {actions.length > 0 && (
                <li className="relative text-sm text-slate-400">
                  <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-slate-300 bg-white" aria-hidden="true" />
                  Next: {actions.map((status) => ACTION_LABELS[status] ?? status).join(' or ')}
                </li>
              )}
            </ol>
          </Card>
        </div>
      </div>

      <Dialog
        open={rejecting}
        onClose={() => setRejecting(false)}
        title="Reject this application?"
        description={`${app.applicantName} (${app.id}) will be marked as Rejected. A reason is mandatory.`}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setRejecting(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={reason === 'Other' && !note.trim()}
              onClick={() => {
                setRejecting(false);
                void update('Rejected', { reason, note: note.trim() || undefined });
              }}
            >
              Reject application
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <label htmlFor="detail-reason" className="mb-1.5 block text-sm font-semibold text-slate-700">
              Reason
            </label>
            <Select id="detail-reason" value={reason} onChange={(event) => setReason(event.target.value as RejectionReason)}>
              {REJECTION_REASONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label htmlFor="detail-note" className="mb-1.5 block text-sm font-semibold text-slate-700">
              Note for the audit trail {reason === 'Other' && <span className="text-red-600">(required)</span>}
            </label>
            <Input id="detail-note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={300} placeholder="e.g. roof photos missing" />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
