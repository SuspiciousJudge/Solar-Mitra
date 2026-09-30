import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { PageHeader } from '@/components/admin/PageHeader';
import { ErrorState, FullPageLoader } from '@/components/shared/States';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Field, Select, Textarea } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { getErrorMessage } from '@/services/api';
import {
  approveProviderApplication,
  assignProviderApplication,
  fetchProviderApplication,
  fetchProviderDocumentBlob,
  patchProviderChecklist,
  rejectProviderApplication,
  requestProviderChanges,
  verifyProviderDocument,
} from '@/services/providerService';
import type { ProviderApplication } from '@/types/provider';
import { cn } from '@/utils/cn';
import { CHECKLIST_ITEMS, DOCUMENT_TYPE_LABELS, MANDATORY_CHECKLIST_KEYS, PROVIDER_REJECTION_CODES, PROVIDER_REJECTION_LABELS, RISK_FLAG_LABELS, type ChecklistKey } from '@/utils/providerRules';

const TABS = ['Business', 'Statutory', 'Credentials', 'Experience', 'Service area', 'Bank', 'Contact', 'References', 'Timeline'] as const;

export function ProviderApplicationReviewPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const [application, setApplication] = useState<ProviderApplication | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]>('Business');
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<{ url: string; name: string; mime: string; id: string } | null>(null);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [changesOpen, setChangesOpen] = useState(false);
  const [note, setNote] = useState('');
  const [tier, setTier] = useState<'Standard' | 'Preferred'>('Standard');
  const [reasonCode, setReasonCode] = useState<(typeof PROVIDER_REJECTION_CODES)[number]>('other');
  const [changeMessage, setChangeMessage] = useState('');
  useDocumentTitle(application?.businessDetails.legalName ?? 'Review application');

  useEffect(() => {
    setLoading(true);
    fetchProviderApplication(id)
      .then(setApplication)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <FullPageLoader />;
  if (error || !application) return <ErrorState message={error ?? 'Not found'} />;

  const mandatoryPass = MANDATORY_CHECKLIST_KEYS.every((key) => application.checklist[key]?.status === 'pass');
  const canApprove = user?.role === 'admin';
  const canReveal = user?.role === 'admin' || user?.role === 'finance';

  const run = async (action: () => Promise<ProviderApplication>, success: string) => {
    const previous = application;
    try {
      const next = await action();
      setApplication(next);
      toast.success(success);
    } catch (err) {
      setApplication(previous);
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <>
      <PageHeader
        eyebrow={<Link to="/admin/providers/applications" className="text-sm font-semibold text-forest-700">← Queue</Link>}
        title={application.businessDetails.legalName ?? application.id}
        subtitle={`${application.id} · ${application.businessDetails.businessType ?? ''} · ${application.businessDetails.registeredAddress?.state ?? ''}`}
        actions={<Badge>{application.status}</Badge>}
      />
      {application.riskFlags.length > 0 && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="font-bold text-amber-900">Risk flags</p>
          <ul className="mt-2 list-disc pl-5 text-sm text-amber-900">
            {application.riskFlags.map((flag) => (
              <li key={flag}>{RISK_FLAG_LABELS[flag]}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="overflow-hidden">
          <div className="flex gap-1 overflow-x-auto border-b border-slate-100 p-2">
            {TABS.map((item) => (
              <button
                key={item}
                type="button"
                className={cn('whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold', tab === item ? 'bg-forest-700 text-white' : 'text-slate-600 hover:bg-slate-100')}
                onClick={() => setTab(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="p-5 text-sm">
            {tab === 'Business' && (
              <Dl rows={[
                ['Legal name', application.businessDetails.legalName],
                ['Trade name', application.businessDetails.tradeName],
                ['Type', application.businessDetails.businessType],
                ['Year', String(application.businessDetails.yearEstablished ?? '')],
                ['Address', `${application.businessDetails.registeredAddress?.line1 ?? ''}, ${application.businessDetails.registeredAddress?.city ?? ''}`],
                ['Directors', (application.businessDetails.principals ?? []).map((person) => person.name).join(', ')],
              ]} />
            )}
            {tab === 'Statutory' && (
              <Dl rows={[
                ['GSTIN', application.statutory.gstin],
                ['PAN', application.statutory.pan],
                ['Udyam', application.statutory.udyam],
                ['CIN', application.statutory.cin],
                ['LLPIN', application.statutory.llpin],
              ]} />
            )}
            {tab === 'Credentials' && (
              <Dl rows={[
                ['Licence', application.credentials.electricalLicenceNo],
                ['Authority', application.credentials.electricalLicenceAuthority],
                ['Valid till', application.credentials.electricalLicenceValidTill],
                ['DISCOM', application.credentials.discomEmpanelled ? (application.credentials.discomNames ?? []).join(', ') : 'No'],
                ['Panels', (application.credentials.panelBrands ?? []).join(', ')],
              ]} />
            )}
            {tab === 'Experience' && (
              <Dl rows={[
                ['Years', String(application.experience.yearsExperience ?? '')],
                ['Installations', String(application.experience.totalInstallations ?? '')],
                ['Capacity kW', String(application.experience.totalCapacityKw ?? '')],
                ['Team', `${application.experience.engineers ?? 0} eng · ${application.experience.installers ?? 0} installers`],
              ]} />
            )}
            {tab === 'Service area' && (
              <Dl rows={[
                ['States', (application.serviceArea.states ?? []).join(', ')],
                ['Districts', Object.values(application.serviceArea.districtsByState ?? {}).flat().join(', ')],
                ['Languages', (application.serviceArea.languages ?? []).join(', ')],
              ]} />
            )}
            {tab === 'Bank' && (
              <div>
                <Dl rows={[
                  ['Holder', application.bank.accountHolderName],
                  ['IFSC', application.bank.ifsc],
                  ['Bank', application.bank.bankName],
                  ['Account', application.bank.accountNumber ?? application.bank.accountNumberLast4],
                ]} />
                {canReveal && (
                  <Button
                    className="mt-3"
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        setApplication(await fetchProviderApplication(id, true));
                        toast.message('Reveal logged on the timeline');
                      } catch (err) {
                        toast.error(getErrorMessage(err));
                      }
                    }}
                  >
                    Reveal account number
                  </Button>
                )}
              </div>
            )}
            {tab === 'Contact' && (
              <Dl rows={[
                ['Signatory', application.contact.signatoryName],
                ['Designation', application.contact.designation],
                ['Mobile', application.contact.mobile],
                ['Email', application.contact.email],
                ['Aadhaar last 4', application.contact.aadhaarLast4],
                ['Blacklisted?', application.declarations.notBlacklisted === false ? application.declarations.blacklistingExplanation : 'No'],
              ]} />
            )}
            {tab === 'References' && (
              <ul className="space-y-2">
                {(application.experience.references ?? []).map((reference) => (
                  <li key={`${reference.name}-${reference.phone}`} className="rounded-xl bg-slate-50 p-3">
                    {reference.name} · {reference.city} · {reference.systemKw} kW · {reference.phone}
                  </li>
                ))}
              </ul>
            )}
            {tab === 'Timeline' && (
              <ol className="space-y-3">
                {application.timeline.slice().reverse().map((event) => (
                  <li key={`${event.at}-${event.status}`} className="border-l-2 border-forest-200 pl-3">
                    <p className="font-semibold">{event.status}</p>
                    <p className="text-slate-600">{event.note}</p>
                    <p className="text-xs text-slate-400">{new Date(event.at).toLocaleString()} · {event.byName}</p>
                  </li>
                ))}
              </ol>
            )}
            <div className="mt-6">
              <h3 className="mb-2 font-bold">Documents</h3>
              <ul className="space-y-2">
                {application.documents.map((document) => (
                  <li key={document.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2">
                    <span>{DOCUMENT_TYPE_LABELS[document.type]} · {document.fileName}</span>
                    <span className="flex gap-2">
                      <Badge variant={document.verification === 'verified' ? 'green' : document.verification === 'rejected' ? 'red' : 'gray'}>{document.verification}</Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          const blob = await fetchProviderDocumentBlob(document.id);
                          const url = URL.createObjectURL(blob);
                          setPreview({ url, name: document.fileName, mime: document.mimeType, id: document.id });
                        }}
                      >
                        View
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card className="p-4">
            <h2 className="font-bold">Verification checklist</h2>
            <ul className="mt-3 space-y-3">
              {CHECKLIST_ITEMS.map((item) => {
                const state = application.checklist[item.key];
                return (
                  <li key={item.key} className="text-sm">
                    <p className="font-medium">{item.label}{item.mandatory ? ' *' : ''}</p>
                    <div className="mt-1 flex gap-1">
                      {(['pass', 'fail', 'pending'] as const).map((status) => (
                        <button
                          key={status}
                          type="button"
                          className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', state?.status === status ? (status === 'pass' ? 'bg-forest-700 text-white' : status === 'fail' ? 'bg-red-600 text-white' : 'bg-slate-700 text-white') : 'bg-slate-100')}
                          onClick={() => void run(() => patchProviderChecklist(id, { itemKey: item.key as ChecklistKey, status }), 'Checklist updated')}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
          <Card className="space-y-2 p-4">
            <Button className="w-full" variant="outline" onClick={() => void run(() => assignProviderApplication(id, { assignToMe: true }), 'Assigned to you')}>
              Assign to me
            </Button>
            <Button className="w-full" variant="outline" onClick={() => setChangesOpen(true)}>Request changes</Button>
            <Button className="w-full" disabled={!canApprove || !mandatoryPass} onClick={() => setApproveOpen(true)}>
              Approve
            </Button>
            <Button className="w-full" variant="danger" onClick={() => setRejectOpen(true)}>Reject</Button>
            {!mandatoryPass && <p className="text-xs text-slate-500">Approve stays disabled until every mandatory checklist item is pass.</p>}
          </Card>
        </div>
      </div>

      <Dialog open={preview !== null} onClose={() => { if (preview) URL.revokeObjectURL(preview.url); setPreview(null); }} title={preview?.name ?? 'Document'} className="max-w-3xl">
        {preview && (
          <div className="space-y-3">
            {preview.mime.startsWith('image/') ? (
              <img src={preview.url} alt={preview.name} className="max-h-[60vh] w-full object-contain" />
            ) : (
              <iframe title={preview.name} src={preview.url} className="h-[60vh] w-full rounded-xl border" />
            )}
            <div className="flex gap-2">
              <Button onClick={() => void run(() => verifyProviderDocument(id, preview.id, { verification: 'verified' }), 'Document verified')}>Verify</Button>
              <Button variant="danger" onClick={() => void run(() => verifyProviderDocument(id, preview.id, { verification: 'rejected', remark: 'Rejected from viewer' }), 'Document rejected')}>Reject</Button>
            </div>
          </div>
        )}
      </Dialog>

      <Dialog
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
        title="Approve this partner?"
        description="A verified, active vendor record will be created for the consumer installer list."
        footer={
          <>
            <Button variant="outline" onClick={() => setApproveOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                setApproveOpen(false);
                void run(() => approveProviderApplication(id, { note, tier }), 'Partner approved');
              }}
            >
              Approve
            </Button>
          </>
        }
      >
        <Field id="tier" label="Partner tier">
          <Select id="tier" value={tier} onChange={(e) => setTier(e.target.value as 'Standard' | 'Preferred')}>
            <option value="Standard">Standard</option>
            <option value="Preferred">Preferred</option>
          </Select>
        </Field>
        <Field id="appr-note" label="Note" className="mt-3">
          <Textarea id="appr-note" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </Dialog>

      <Dialog open={rejectOpen} onClose={() => setRejectOpen(false)} title="Reject application" footer={
        <>
          <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
          <Button variant="danger" onClick={() => { setRejectOpen(false); void run(() => rejectProviderApplication(id, { reasonCode, message: note || 'Rejected' }), 'Rejected'); }}>Reject</Button>
        </>
      }>
        <Field id="reason" label="Reason">
          <Select id="reason" value={reasonCode} onChange={(e) => setReasonCode(e.target.value as typeof reasonCode)}>
            {PROVIDER_REJECTION_CODES.map((code) => (
              <option key={code} value={code}>{PROVIDER_REJECTION_LABELS[code]}</option>
            ))}
          </Select>
        </Field>
        <Field id="rej-note" label="Message" className="mt-3">
          <Textarea id="rej-note" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </Dialog>

      <Dialog open={changesOpen} onClose={() => setChangesOpen(false)} title="Request changes" footer={
        <>
          <Button variant="outline" onClick={() => setChangesOpen(false)}>Cancel</Button>
          <Button onClick={() => { setChangesOpen(false); void run(() => requestProviderChanges(id, { fields: ['credentials.electricalLicenceValidTill'], documents: ['electrical_licence'], message: changeMessage }), 'Change request sent'); }}>Send</Button>
        </>
      }>
        <Field id="chg" label="Message to the provider">
          <Textarea id="chg" value={changeMessage} onChange={(e) => setChangeMessage(e.target.value)} />
        </Field>
      </Dialog>
    </>
  );
}

function Dl({ rows }: { rows: [string, string | undefined][] }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label} className="rounded-xl bg-slate-50 p-3">
          <dt className="text-xs font-semibold uppercase text-slate-500">{label}</dt>
          <dd className="mt-0.5 font-medium text-slate-900">{value || '—'}</dd>
        </div>
      ))}
    </dl>
  );
}
