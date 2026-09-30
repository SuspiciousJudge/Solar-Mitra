import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ErrorState, FullPageLoader } from '@/components/shared/States';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, Input } from '@/components/ui/input';
import { useProviderAuth } from '@/context/ProviderAuthContext';
import { useAsync } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { getErrorMessage } from '@/services/api';
import { fetchOwnApplication, fetchProviderLeads, fetchProviderPayouts, updateProviderLead } from '@/services/providerService';
import { formatINR } from '@/utils/format';
import { daysUntil } from '@/utils/providerRules';

export function ProviderDashboardPage() {
  useDocumentTitle('Partner dashboard');
  const { user } = useProviderAuth();
  const applicationQuery = useAsync(() => fetchOwnApplication(), []);
  const leadsQuery = useAsync(() => fetchProviderLeads(), [user?.providerId]);
  const payoutsQuery = useAsync(() => fetchProviderPayouts(), [user?.providerId]);
  const [note, setNote] = useState('');

  if (applicationQuery.loading) return <FullPageLoader />;
  if (applicationQuery.error || !applicationQuery.data) return <ErrorState message={applicationQuery.error ?? 'Could not load dashboard'} onRetry={applicationQuery.reload} />;
  const application = applicationQuery.data;
  if (application.status !== 'Approved' && application.status !== 'Suspended') {
    return <Navigate to="/provider/status" replace />;
  }
  if (application.status === 'Suspended') {
    return (
      <Card className="p-6">
        <h1 className="text-2xl font-extrabold">Account suspended</h1>
        <p className="mt-2 text-slate-600">{application.suspendReason ?? 'Please contact SolarMitra support.'}</p>
      </Card>
    );
  }

  const days = application.credentials.electricalLicenceValidTill ? daysUntil(application.credentials.electricalLicenceValidTill) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">{application.businessDetails.legalName}</h1>
          <p className="text-sm text-slate-500">{application.providerId} · {application.businessDetails.registeredAddress?.state}</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="green">Verified</Badge>
          {application.tier && <Badge variant="blue">{application.tier}</Badge>}
        </div>
      </div>
      {days != null && days <= 30 && (
        <p role="status" className="rounded-2xl bg-solar-50 px-4 py-3 text-sm font-medium text-solar-900">
          Electrical licence {days < 0 ? 'expired' : `expires in ${days} days`}.
        </p>
      )}
      <section>
        <h2 className="mb-3 font-bold">Assigned household leads</h2>
        {leadsQuery.error && <ErrorState message={leadsQuery.error} onRetry={leadsQuery.reload} />}
        <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                {['Lead', 'City', 'kW', 'Status', 'Update'].map((heading) => (
                  <th key={heading} className="px-4 py-3">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(leadsQuery.data ?? []).map((lead) => (
                <tr key={lead.id}>
                  <td className="px-4 py-3 font-semibold">{lead.customerFirstName}</td>
                  <td className="px-4 py-3">{lead.city}</td>
                  <td className="px-4 py-3">{lead.systemKW}</td>
                  <td className="px-4 py-3">{lead.status}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {(['site_visit_done', 'installation_scheduled', 'installed'] as const).map((kind) => (
                        <Button
                          key={kind}
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            try {
                              await updateProviderLead(lead.id, { kind, date: new Date().toISOString().slice(0, 10), note });
                              toast.success('Update sent to operator for confirmation');
                              leadsQuery.reload();
                            } catch (err) {
                              toast.error(getErrorMessage(err));
                            }
                          }}
                        >
                          {kind.replace(/_/g, ' ')}
                        </Button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(leadsQuery.data?.length ?? 0) === 0 && <p className="p-6 text-sm text-slate-500">No household leads assigned yet.</p>}
        </div>
        <Field id="lead-note" label="Note for operator" className="mt-3 max-w-md">
          <Input id="lead-note" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </section>
      <section>
        <h2 className="mb-3 font-bold">Payouts</h2>
        <ul className="space-y-2">
          {(payoutsQuery.data ?? []).map((row) => (
            <li key={row.id} className="flex justify-between rounded-2xl bg-white px-4 py-3 text-sm shadow-soft">
              <span>{row.applicantName}</span>
              <span className="font-semibold">{formatINR(row.amountINR)}</span>
            </li>
          ))}
          {(payoutsQuery.data?.length ?? 0) === 0 && <p className="text-sm text-slate-500">No vendor payout entries yet.</p>}
        </ul>
      </section>
      <p className="text-xs text-slate-500">Changes to bank, GST or licence require operator re-approval. Other profile fields can be edited from the application while in draft.</p>
    </div>
  );
}
