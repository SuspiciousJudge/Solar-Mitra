import { Link } from 'react-router-dom';
import { ErrorState, FullPageLoader } from '@/components/shared/States';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAsync } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { fetchOwnApplication } from '@/services/providerService';
import { cn } from '@/utils/cn';

const PIPELINE = ['Draft', 'Submitted', 'Under Review', 'Approved'] as const;

export function ProviderStatusPage() {
  useDocumentTitle('Application status');
  const query = useAsync(() => fetchOwnApplication(), []);
  if (query.loading) return <FullPageLoader />;
  if (query.error || !query.data) return <ErrorState message={query.error ?? 'Could not load status'} onRetry={query.reload} />;
  const application = query.data;
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase text-forest-700">{application.id}</p>
        <h1 className="text-2xl font-extrabold text-slate-900">Application status</h1>
      </div>
      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={application.status === 'Approved' ? 'green' : application.status === 'Rejected' ? 'red' : 'yellow'}>{application.status}</Badge>
          {application.tier && <Badge variant="blue">{application.tier}</Badge>}
        </div>
        <ol className="mt-6 grid grid-cols-4 gap-2">
          {PIPELINE.map((status, index) => {
            const reached = PIPELINE.indexOf(application.status as (typeof PIPELINE)[number]) >= index || application.status === 'Approved';
            return (
              <li key={status} className="text-center">
                <span className={cn('mx-auto block h-1.5 rounded-full', reached ? 'bg-forest-600' : 'bg-slate-200')} />
                <span className="mt-2 block text-xs font-semibold text-slate-600">{status}</span>
              </li>
            );
          })}
        </ol>
        {application.changeRequest && application.status === 'Changes Requested' && (
          <div className="mt-6 rounded-2xl bg-solar-50 p-4 text-sm">
            <p className="font-bold text-solar-900">Changes requested</p>
            <p className="mt-1 text-solar-900">{application.changeRequest.message}</p>
            <ul className="mt-2 list-disc pl-5 text-solar-900">
              {application.changeRequest.fields.map((field) => (
                <li key={field}>{field}</li>
              ))}
              {application.changeRequest.documents.map((doc) => (
                <li key={doc}>Document: {doc}</li>
              ))}
            </ul>
            <Link to={`/provider/application?step=${application.changeRequest.fields[0]?.startsWith('bank') ? 'bank' : 'credentials'}`} className="mt-3 inline-block">
              <Button size="sm">Fix and resubmit</Button>
            </Link>
          </div>
        )}
        {application.rejectReason && (
          <p className="mt-4 text-sm text-red-700">{application.rejectReason.message}</p>
        )}
        {application.suspendReason && (
          <p className="mt-4 text-sm text-red-700">Suspended: {application.suspendReason}. Contact support.</p>
        )}
      </Card>
      <Card className="p-5">
        <h2 className="font-bold text-slate-900">Operator remarks</h2>
        <ol className="mt-3 space-y-3">
          {application.timeline.slice().reverse().map((event) => (
            <li key={`${event.at}-${event.status}`} className="border-l-2 border-forest-200 pl-3 text-sm">
              <p className="font-semibold">{event.status}</p>
              <p className="text-slate-600">{event.note}</p>
              <p className="text-xs text-slate-400">{new Date(event.at).toLocaleString()} · {event.byName ?? 'System'}</p>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
