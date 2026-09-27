import { ArrowLeft, BadgeCheck, CalendarCheck, Check, CircleCheckBig, IndianRupee, MapPin, Phone, ShieldCheck, Star, User, X, Zap } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { Disclaimer } from '@/components/shared/Disclaimer';
import { EmptyState, ErrorState } from '@/components/shared/States';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAsync } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { NEXT_STATUS, useStatusUpdate } from '@/hooks/useStatusUpdate';
import { fetchApplication } from '@/services/applicationService';
import type { ApplicationStatus } from '@/types';
import { formatDate, formatINR, formatNumber } from '@/utils/format';
import { calculateCO2Impact } from '@/utils/solarCalculator';

function Section({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <Card className="p-5">
      <h2 className="mb-4 flex items-center gap-2 font-bold text-slate-900">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-forest-50 text-forest-700">{icon}</span>
        {title}
      </h2>
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
  const query = useAsync(() => fetchApplication(id), [id]);
  const { changeStatus, pendingId } = useStatusUpdate();
  const [confirmReject, setConfirmReject] = useState(false);
  const app = query.data;

  const apply = (_id: string, status: ApplicationStatus) =>
    query.setData((prev) =>
      prev
        ? {
            ...prev,
            status,
            timeline: prev.status === status ? prev.timeline : [...prev.timeline, { status, note: 'Updated by operator', at: new Date().toISOString() }],
          }
        : prev,
    );

  const update = async (status: ApplicationStatus) => {
    if (!app) return;
    const ok = await changeStatus(app, status, apply);
    if (ok) query.reload();
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
        action={<Link to="/admin/leads" className={buttonVariants({ size: 'sm' })}>Back to leads</Link>}
      />
    ) : (
      <ErrorState message={query.error} onRetry={query.reload} />
    );
  }
  if (!app) return null;

  const next = NEXT_STATUS[app.status];
  const busy = pendingId === app.id;
  const impact = calculateCO2Impact(app.systemKW);

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
          </div>
          <p className="mt-1 font-mono text-sm text-slate-500">
            {app.id} · submitted {formatDate(app.createdAt, true)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {app.status === 'Pending Verification' && (
            <>
              <Button variant="outline" className="text-red-600" onClick={() => setConfirmReject(true)} disabled={busy}>
                <X className="h-4 w-4" aria-hidden="true" /> Reject
              </Button>
              <Button onClick={() => update('Approved')} loading={busy}>
                {!busy && <Check className="h-4 w-4" aria-hidden="true" />} Approve loan
              </Button>
            </>
          )}
          {next && (
            <Button onClick={() => update(next.status)} loading={busy}>
              {!busy && (next.status === 'Completed' ? <CircleCheckBig className="h-4 w-4" aria-hidden="true" /> : <CalendarCheck className="h-4 w-4" aria-hidden="true" />)}
              {next.label}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Section title="Applicant" icon={<User className="h-4 w-4" aria-hidden="true" />}>
            <Item label="Name" value={app.applicantName} />
            <Item label="Phone" value={<span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />+91 {app.phone}</span>} />
            <Item label="Location" value={<span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />{app.location}</span>} />
            <Item label="State" value={app.state} />
          </Section>
          <Section title="Energy profile" icon={<Zap className="h-4 w-4" aria-hidden="true" />}>
            <Item label="Monthly units" value={`${formatNumber(app.monthlyUnits)} kWh`} />
            <Item label="Monthly bill" value={app.monthlyBill > 0 ? formatINR(app.monthlyBill) : 'Not provided'} />
            <Item label="Recommended system" value={`${app.systemKW} kW`} strong />
            <Item label="Estimated climate impact" value={`${formatNumber(impact.estimatedCO2OffsetTonnes)} t CO₂/yr`} />
          </Section>
          <Section title="Financial profile" icon={<IndianRupee className="h-4 w-4" aria-hidden="true" />}>
            <Item label="System cost" value={formatINR(app.marketCost)} />
            <Item label="Central subsidy" value={`− ${formatINR(app.centralSubsidy)}`} />
            <Item label="State support" value={`− ${formatINR(app.stateSubsidy)}`} />
            <Item label="Net cost" value={formatINR(app.netCost)} strong />
            <Item label="Loan amount" value={app.loanAmount > 0 ? formatINR(app.loanAmount) : 'Paying upfront'} strong />
            <Item
              label="EMI"
              value={app.loanAmount > 0 ? `${formatINR(app.emi)}/month · ${app.tenureMonths} mo @ ${app.interestRate}%` : '—'}
            />
          </Section>
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
                    <Badge variant="green"><ShieldCheck className="h-3 w-3" aria-hidden="true" /> MNRE Empanelled</Badge>
                  ) : (
                    <Badge variant="red">Not empanelled</Badge>
                  )}
                  {app.vendor.verified ? (
                    <Badge variant="blue"><BadgeCheck className="h-3 w-3" aria-hidden="true" /> Verified</Badge>
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
                  <time className="text-xs text-slate-400" dateTime={event.at}>
                    {formatDate(event.at, true)}
                  </time>
                </li>
              ))}
              {app.status !== 'Completed' && app.status !== 'Rejected' && (
                <li className="relative text-sm text-slate-400">
                  <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-slate-300 bg-white" aria-hidden="true" />
                  Next: {next?.status ?? 'Approval'} → Solar Activation
                </li>
              )}
            </ol>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirmReject}
        title="Reject this application?"
        description={`${app.applicantName} (${app.id}) will be marked as Rejected and notified by SMS.`}
        confirmLabel="Reject application"
        onCancel={() => setConfirmReject(false)}
        onConfirm={() => {
          setConfirmReject(false);
          void update('Rejected');
        }}
      />
    </div>
  );
}
