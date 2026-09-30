import { Check, ChevronLeft, ChevronRight, Lock, Save, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ErrorState, FullPageLoader } from '@/components/shared/States';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { INDIA_REGIONS } from '@/data/indiaRegions';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { getErrorMessage } from '@/services/api';
import {
  deleteProviderDocument,
  fetchOwnApplication,
  saveApplicationStep,
  submitProviderApplication,
  uploadProviderDocument,
} from '@/services/providerService';
import type { Principal, ProviderApplication } from '@/types/provider';
import { cn } from '@/utils/cn';
import {
  ACCOUNT_TYPES,
  BUSINESS_TYPES,
  CERTIFICATIONS,
  DOCUMENT_TYPE_LABELS,
  INVERTER_BRANDS,
  PANEL_BRANDS,
  PROVIDER_STEP_LABELS,
  PROVIDER_STEPS,
  STAFF_LANGUAGES,
  TYPICAL_SYSTEM_SIZES,
  canEditApplication,
  gstinStateCodeForName,
  isValidGstinChecksum,
  licenceExpiryFlag,
  lookupIfsc,
  namesLooselyMatch,
  panFourthMatchesBusiness,
  panFromGstin,
  requiredDocumentsFor,
  type DocumentType,
  type ProviderStep,
} from '@/utils/providerRules';

const STEP_HASH: Record<string, number> = Object.fromEntries(PROVIDER_STEPS.map((step, index) => [step, index]));

function yearsInBusiness(year?: number) {
  return year ? new Date().getFullYear() - year : undefined;
}

export function ProviderApplicationPage() {
  useDocumentTitle('Partner application');
  const [params, setParams] = useSearchParams();
  const [application, setApplication] = useState<ProviderApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [stepIndex, setStepIndex] = useState(() => STEP_HASH[params.get('step') ?? ''] ?? 0);
  const [review, setReview] = useState(params.get('review') === '1');
  const skipSave = useRef(true);

  useEffect(() => {
    fetchOwnApplication()
      .then((data) => {
        setApplication(data);
        skipSave.current = true;
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const step = review ? 'review' : PROVIDER_STEPS[Math.min(stepIndex, PROVIDER_STEPS.length - 1)];
  const debouncedApp = useDebouncedValue(application, 800);

  useEffect(() => {
    if (!debouncedApp || skipSave.current) {
      skipSave.current = false;
      return;
    }
    if (!canEditApplication(debouncedApp.status) || review) return;
    const current = PROVIDER_STEPS[stepIndex];
    void persist(current, debouncedApp, false);
  }, [debouncedApp, stepIndex, review]);

  const persist = async (current: ProviderStep, data: ProviderApplication, notify: boolean) => {
    if (!canEditApplication(data.status)) return data;
    setSaving(true);
    try {
      const payload = payloadFor(current, data);
      const saved = await saveApplicationStep(current, payload);
      skipSave.current = true;
      setApplication(saved);
      if (notify) toast.success('Draft saved');
      return saved;
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not save this step.'));
      return data;
    } finally {
      setSaving(false);
    }
  };

  const go = (next: number, toReview = false) => {
    setReview(toReview);
    setStepIndex(next);
    const nextParams = new URLSearchParams();
    if (toReview) nextParams.set('review', '1');
    else nextParams.set('step', PROVIDER_STEPS[next]);
    setParams(nextParams, { replace: true });
  };

  if (loading) return <FullPageLoader />;
  if (error || !application) return <ErrorState message={error ?? 'Could not load the application'} onRetry={() => window.location.reload()} />;

  const editable = canEditApplication(application.status);
  const uploaded = new Set(application.documents.map((document) => document.type));
  const mandatoryDocs = requiredDocumentsFor({
    business: application.businessDetails,
    statutory: application.statutory,
    credentials: application.credentials,
    experience: application.experience,
    serviceArea: application.serviceArea,
    bank: application.bank,
    contact: application.contact,
    declarations: application.declarations,
    documentTypes: [...uploaded],
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-forest-700">{application.id}</p>
            <h1 className="text-2xl font-extrabold text-slate-900">Onboarding application</h1>
          </div>
          <div className="flex items-center gap-2">
            {!editable && (
              <Badge variant="yellow">
                <Lock className="h-3 w-3" aria-hidden="true" /> Locked
              </Badge>
            )}
            <Badge>{application.status}</Badge>
          </div>
        </div>
        <Progress value={application.completeness} label="Application completeness" />
        <p className="mt-1 text-xs text-slate-500">{application.completeness}% complete</p>

        <ol className="mt-6 flex gap-1 overflow-x-auto pb-2" aria-label="Application steps">
          {PROVIDER_STEPS.map((key, index) => (
            <li key={key}>
              <button
                type="button"
                className={cn(
                  'whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold',
                  !review && index === stepIndex ? 'bg-forest-700 text-white' : 'bg-slate-100 text-slate-600',
                )}
                onClick={() => go(index)}
              >
                {index + 1}. {PROVIDER_STEP_LABELS[key]}
              </button>
            </li>
          ))}
          <li>
            <button type="button" className={cn('whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold', review ? 'bg-forest-700 text-white' : 'bg-slate-100 text-slate-600')} onClick={() => go(stepIndex, true)}>
              Review
            </button>
          </li>
        </ol>

        <Card className="mt-4 p-5 sm:p-6">
          {review ? (
            <ReviewPane application={application} onEdit={(index) => go(index)} />
          ) : (
            <StepFields application={application} step={step as ProviderStep} editable={editable} onChange={setApplication} />
          )}
        </Card>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <Button variant="outline" disabled={review ? false : stepIndex === 0} onClick={() => (review ? go(stepIndex) : go(Math.max(0, stepIndex - 1)))}>
            <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Back
          </Button>
          <div className="flex flex-wrap gap-2">
            {editable && !review && (
              <Button variant="subtle" loading={saving} onClick={() => void persist(step as ProviderStep, application, true)}>
                <Save className="h-4 w-4" aria-hidden="true" /> Save & continue later
              </Button>
            )}
            {!review && (
              <Button
                onClick={async () => {
                  if (editable) await persist(step as ProviderStep, application, false);
                  if (stepIndex === PROVIDER_STEPS.length - 1) go(stepIndex, true);
                  else go(stepIndex + 1);
                }}
              >
                Next <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
            {review && editable && (
              <Button
                disabled={application.completeness < 100}
                onClick={async () => {
                  try {
                    const saved = application.status === 'Changes Requested' ? await (await import('@/services/providerService')).resubmitProviderApplication() : await submitProviderApplication();
                    setApplication(saved);
                    toast.success(`Submitted ${saved.id}`);
                  } catch (err) {
                    toast.error(getErrorMessage(err, 'Could not submit.'));
                  }
                }}
              >
                Submit application
              </Button>
            )}
          </div>
        </div>
        {review && application.completeness < 100 && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            Submit is enabled at 100% mandatory complete. Still missing: {application.missing.slice(0, 4).join(', ')}
          </p>
        )}
      </div>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <Card className="p-4">
          <h2 className="text-sm font-bold text-slate-900">Required documents</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {mandatoryDocs.map((type) => (
              <li key={type} className="flex items-start gap-2">
                <span className={cn('mt-0.5 flex h-4 w-4 items-center justify-center rounded-full', uploaded.has(type) ? 'bg-forest-600 text-white' : 'bg-slate-200 text-slate-500')}>
                  {uploaded.has(type) ? <Check className="h-3 w-3" aria-hidden="true" /> : null}
                </span>
                {DOCUMENT_TYPE_LABELS[type]}
              </li>
            ))}
          </ul>
        </Card>
        {editable && <DocumentPanel application={application} onChange={setApplication} />}
        <p className="text-xs text-slate-500">Drafts auto-save on this device session when you pause typing. Demo verification only.</p>
      </aside>
    </div>
  );
}

function payloadFor(step: ProviderStep, application: ProviderApplication): Record<string, unknown> {
  if (step === 'business') return { ...application.businessDetails };
  if (step === 'statutory') return { ...application.statutory };
  if (step === 'credentials') return { ...application.credentials };
  if (step === 'experience') return { ...application.experience };
  if (step === 'serviceArea') return { ...application.serviceArea };
  if (step === 'bank') return { ...application.bank };
  return { ...application.contact, ...application.declarations };
}

function StepFields({
  application,
  step,
  editable,
  onChange,
}: {
  application: ProviderApplication;
  step: ProviderStep;
  editable: boolean;
  onChange: (application: ProviderApplication) => void;
}) {
  const disabled = !editable;
  const setBusiness = (patch: Partial<ProviderApplication['businessDetails']>) => onChange({ ...application, businessDetails: { ...application.businessDetails, ...patch } });
  const setStatutory = (patch: Partial<ProviderApplication['statutory']>) => onChange({ ...application, statutory: { ...application.statutory, ...patch } });
  const setCred = (patch: Partial<ProviderApplication['credentials']>) => onChange({ ...application, credentials: { ...application.credentials, ...patch } });
  const setExp = (patch: Partial<ProviderApplication['experience']>) => onChange({ ...application, experience: { ...application.experience, ...patch } });
  const setArea = (patch: Partial<ProviderApplication['serviceArea']>) => onChange({ ...application, serviceArea: { ...application.serviceArea, ...patch } });
  const setBank = (patch: Partial<ProviderApplication['bank']>) => onChange({ ...application, bank: { ...application.bank, ...patch } });
  const setContact = (patch: Partial<ProviderApplication['contact']>) => onChange({ ...application, contact: { ...application.contact, ...patch } });
  const setDecl = (patch: Partial<ProviderApplication['declarations']>) => onChange({ ...application, declarations: { ...application.declarations, ...patch } });

  if (step === 'business') {
    const principals = application.businessDetails.principals?.length ? application.businessDetails.principals : [{ name: '', designation: '', mobile: '', email: '' }];
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-bold">Business details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="legalName" label="Legal business name *">
            <Input id="legalName" disabled={disabled} value={application.businessDetails.legalName ?? ''} onChange={(e) => setBusiness({ legalName: e.target.value })} />
          </Field>
          <Field id="tradeName" label="Trade / brand name">
            <Input id="tradeName" disabled={disabled} value={application.businessDetails.tradeName ?? ''} onChange={(e) => setBusiness({ tradeName: e.target.value })} />
          </Field>
          <Field id="businessType" label="Business type *">
            <Select id="businessType" disabled={disabled} value={application.businessDetails.businessType ?? ''} onChange={(e) => setBusiness({ businessType: e.target.value as ProviderApplication['businessDetails']['businessType'] })}>
              <option value="">Select</option>
              {BUSINESS_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </Select>
          </Field>
          <Field id="yearEstablished" label="Year of establishment *" hint={yearsInBusiness(application.businessDetails.yearEstablished) != null ? `${yearsInBusiness(application.businessDetails.yearEstablished)} years in business` : '1950–current year'}>
            <Input id="yearEstablished" type="number" disabled={disabled} value={application.businessDetails.yearEstablished ?? ''} onChange={(e) => setBusiness({ yearEstablished: Number(e.target.value) })} />
          </Field>
          <Field id="companyEmail" label="Company email *">
            <Input id="companyEmail" type="email" disabled={disabled} value={application.businessDetails.companyEmail ?? ''} onChange={(e) => setBusiness({ companyEmail: e.target.value })} />
          </Field>
          <Field id="website" label="Website">
            <Input id="website" disabled={disabled} placeholder="https://" value={application.businessDetails.website ?? ''} onChange={(e) => setBusiness({ website: e.target.value })} />
          </Field>
        </div>
        <h3 className="font-semibold">Proprietor / directors</h3>
        {principals.map((person, index) => (
          <div key={index} className="grid gap-3 rounded-2xl bg-slate-50 p-3 sm:grid-cols-2">
            {(['name', 'designation', 'mobile', 'email'] as const).map((key) => (
              <Field key={key} id={`p-${index}-${key}`} label={key}>
                <Input
                  id={`p-${index}-${key}`}
                  disabled={disabled}
                  value={person[key] ?? ''}
                  onChange={(e) => {
                    const next = principals.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: e.target.value } : row));
                    setBusiness({ principals: next as Principal[] });
                  }}
                />
              </Field>
            ))}
          </div>
        ))}
        {editable && (
          <Button variant="outline" size="sm" onClick={() => setBusiness({ principals: [...principals, { name: '', designation: '', mobile: '', email: '' }] })}>
            Add person
          </Button>
        )}
        <h3 className="font-semibold">Registered address *</h3>
        <AddressFields disabled={disabled} value={application.businessDetails.registeredAddress ?? {}} onChange={(registeredAddress) => setBusiness({ registeredAddress, operationalAddress: application.businessDetails.sameAsRegistered ? registeredAddress : application.businessDetails.operationalAddress })} />
        <Checkbox id="same-addr" checked={application.businessDetails.sameAsRegistered !== false} onChange={(checked) => setBusiness({ sameAsRegistered: checked, operationalAddress: checked ? application.businessDetails.registeredAddress : application.businessDetails.operationalAddress })} label="Operational address is the same as registered" />
        {application.businessDetails.sameAsRegistered === false && (
          <AddressFields disabled={disabled} value={application.businessDetails.operationalAddress ?? {}} onChange={(operationalAddress) => setBusiness({ operationalAddress })} />
        )}
      </div>
    );
  }

  if (step === 'statutory') {
    const gstin = (application.statutory.gstin ?? '').toUpperCase();
    const pan = (application.statutory.pan ?? '').toUpperCase();
    const expected = gstinStateCodeForName(application.businessDetails.registeredAddress?.state);
    const gstinError = gstin && !isValidGstinChecksum(gstin) ? 'GSTIN checksum is invalid' : gstin && expected && gstin.slice(0, 2) !== expected ? `Should start with ${expected} for ${application.businessDetails.registeredAddress?.state}` : gstin && pan && panFromGstin(gstin) !== pan ? 'PAN embedded in GSTIN does not match the PAN field' : undefined;
    const panError = pan && application.businessDetails.businessType && !panFourthMatchesBusiness(pan, application.businessDetails.businessType) ? `4th character must match ${application.businessDetails.businessType}` : undefined;
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <h2 className="col-span-full text-lg font-bold">Statutory & tax</h2>
        <Field id="gstin" label="GSTIN *" error={gstinError}>
          <Input id="gstin" disabled={disabled} className="uppercase" value={application.statutory.gstin ?? ''} onChange={(e) => setStatutory({ gstin: e.target.value.toUpperCase() })} invalid={!!gstinError} />
        </Field>
        <Field id="pan" label="PAN *" error={panError}>
          <Input id="pan" disabled={disabled} className="uppercase" value={application.statutory.pan ?? ''} onChange={(e) => setStatutory({ pan: e.target.value.toUpperCase() })} invalid={!!panError} />
        </Field>
        <Field id="udyam" label="Udyam (optional)">
          <Input id="udyam" disabled={disabled} className="uppercase" value={application.statutory.udyam ?? ''} onChange={(e) => setStatutory({ udyam: e.target.value.toUpperCase() })} />
        </Field>
        <Field id="cin" label="CIN (companies)">
          <Input id="cin" disabled={disabled} className="uppercase" value={application.statutory.cin ?? ''} onChange={(e) => setStatutory({ cin: e.target.value.toUpperCase() })} />
        </Field>
        <Field id="llpin" label="LLPIN (LLPs)">
          <Input id="llpin" disabled={disabled} className="uppercase" value={application.statutory.llpin ?? ''} onChange={(e) => setStatutory({ llpin: e.target.value.toUpperCase() })} />
        </Field>
        <Field id="tradeLicence" label="Shop & establishment / trade licence">
          <Input id="tradeLicence" disabled={disabled} value={application.statutory.tradeLicence ?? ''} onChange={(e) => setStatutory({ tradeLicence: e.target.value })} />
        </Field>
      </div>
    );
  }

  if (step === 'credentials') {
    const licenceWarn = licenceExpiryFlag(application.credentials.electricalLicenceValidTill);
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-bold">Solar credentials</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="licNo" label="Electrical contractor licence *">
            <Input id="licNo" disabled={disabled} value={application.credentials.electricalLicenceNo ?? ''} onChange={(e) => setCred({ electricalLicenceNo: e.target.value })} />
          </Field>
          <Field id="licAuth" label="Issuing authority *">
            <Input id="licAuth" disabled={disabled} value={application.credentials.electricalLicenceAuthority ?? ''} onChange={(e) => setCred({ electricalLicenceAuthority: e.target.value })} />
          </Field>
          <Field id="licTill" label="Valid till *" error={licenceWarn === 'expired' ? 'Licence must be in the future' : licenceWarn === 'expiring' ? 'Expires in under 90 days' : undefined}>
            <Input id="licTill" type="date" disabled={disabled} value={application.credentials.electricalLicenceValidTill ?? ''} onChange={(e) => setCred({ electricalLicenceValidTill: e.target.value })} />
          </Field>
        </div>
        <Checkbox id="discom" checked={Boolean(application.credentials.discomEmpanelled)} onChange={(checked) => setCred({ discomEmpanelled: checked })} label="DISCOM-empanelled under PM Surya Ghar / state rooftop programme" />
        {application.credentials.discomEmpanelled && (
          <Field id="discomNames" label="DISCOM name(s)">
            <Input id="discomNames" disabled={disabled} value={(application.credentials.discomNames ?? []).join(', ')} onChange={(e) => setCred({ discomNames: e.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} />
          </Field>
        )}
        <ChipSelect label="Panel brands" options={PANEL_BRANDS} selected={application.credentials.panelBrands ?? []} onToggle={(value) => setCred({ panelBrands: toggle(application.credentials.panelBrands ?? [], value) })} />
        <Checkbox id="almm" checked={Boolean(application.credentials.almmListed)} onChange={(checked) => setCred({ almmListed: checked })} label="We use ALMM-listed modules" />
        <Checkbox id="dcr" checked={Boolean(application.credentials.dcrModules)} onChange={(checked) => setCred({ dcrModules: checked })} label="DCR modules available for subsidy projects" />
        <ChipSelect label="Inverter brands" options={INVERTER_BRANDS} selected={application.credentials.inverterBrands ?? []} onToggle={(value) => setCred({ inverterBrands: toggle(application.credentials.inverterBrands ?? [], value) })} />
        <ChipSelect label="Certifications" options={CERTIFICATIONS} selected={application.credentials.certifications ?? []} onToggle={(value) => setCred({ certifications: toggle(application.credentials.certifications ?? [], value) })} />
      </div>
    );
  }

  if (step === 'experience') {
    const refs = application.experience.references?.length ? application.experience.references : [{ name: '', city: '', systemKw: 3, installationMonth: '', phone: '' }, { name: '', city: '', systemKw: 3, installationMonth: '', phone: '' }];
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-bold">Experience & capacity</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <NumField id="yearsExperience" label="Years of solar experience *" value={application.experience.yearsExperience} onChange={(value) => setExp({ yearsExperience: value })} disabled={disabled} />
          <NumField id="totalInstallations" label="Total installations *" value={application.experience.totalInstallations} onChange={(value) => setExp({ totalInstallations: value })} disabled={disabled} />
          <NumField id="totalCapacityKw" label="Total capacity (kW) *" value={application.experience.totalCapacityKw} onChange={(value) => setExp({ totalCapacityKw: value })} disabled={disabled} />
          <NumField id="engineers" label="Engineers *" value={application.experience.engineers} onChange={(value) => setExp({ engineers: value })} disabled={disabled} />
          <NumField id="electricians" label="Certified electricians *" value={application.experience.certifiedElectricians} onChange={(value) => setExp({ certifiedElectricians: value })} disabled={disabled} />
          <NumField id="installers" label="Installers *" value={application.experience.installers} onChange={(value) => setExp({ installers: value })} disabled={disabled} />
          <NumField id="capacityPerMonth" label="Systems per month *" value={application.experience.capacityPerMonth} onChange={(value) => setExp({ capacityPerMonth: value })} disabled={disabled} />
          <NumField id="workmanship" label="Workmanship warranty (years) *" value={application.experience.workmanshipWarrantyYears} onChange={(value) => setExp({ workmanshipWarrantyYears: value })} disabled={disabled} />
        </div>
        <ChipSelect
          label="Typical system sizes (kW)"
          options={TYPICAL_SYSTEM_SIZES.map(String)}
          selected={(application.experience.typicalSizes ?? []).map(String)}
          onToggle={(value) => setExp({ typicalSizes: toggle((application.experience.typicalSizes ?? []).map(String), value).map(Number) })}
        />
        <p className="text-xs font-semibold uppercase text-slate-500">Indicative price per kW (₹)</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(['kw1', 'kw2', 'kw3', 'kw5'] as const).map((key) => (
            <Field key={key} id={key} label={key.replace('kw', '') + ' kW'}>
              <Input id={key} type="number" disabled={disabled} value={application.experience.pricePerKw?.[key] ?? ''} onChange={(e) => setExp({ pricePerKw: { ...application.experience.pricePerKw, [key]: Number(e.target.value) } })} />
            </Field>
          ))}
        </div>
        <h3 className="font-semibold">Customer references (min 2)</h3>
        {refs.map((reference, index) => (
          <div key={index} className="grid gap-3 rounded-2xl bg-slate-50 p-3 sm:grid-cols-2">
            <Input placeholder="Name" disabled={disabled} value={reference.name ?? ''} onChange={(e) => setExp({ references: refs.map((row, rowIndex) => (rowIndex === index ? { ...row, name: e.target.value } : row)) })} />
            <Input placeholder="City" disabled={disabled} value={reference.city ?? ''} onChange={(e) => setExp({ references: refs.map((row, rowIndex) => (rowIndex === index ? { ...row, city: e.target.value } : row)) })} />
            <Input placeholder="kW" type="number" disabled={disabled} value={reference.systemKw ?? ''} onChange={(e) => setExp({ references: refs.map((row, rowIndex) => (rowIndex === index ? { ...row, systemKw: Number(e.target.value) } : row)) })} />
            <Input placeholder="Phone" disabled={disabled} value={reference.phone ?? ''} onChange={(e) => setExp({ references: refs.map((row, rowIndex) => (rowIndex === index ? { ...row, phone: e.target.value } : row)) })} />
          </div>
        ))}
      </div>
    );
  }

  if (step === 'serviceArea') {
    const selected = application.serviceArea.states ?? [];
    const districts = INDIA_REGIONS.filter((region) => selected.includes(region.name)).flatMap((region) => region.districts.map((district) => ({ state: region.name, district })));
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-bold">Service area</h2>
        <ChipSelect label="States / UTs served *" options={INDIA_REGIONS.map((region) => region.name)} selected={selected} onToggle={(value) => setArea({ states: toggle(selected, value) })} />
        <div>
          <p className="mb-2 text-sm font-semibold text-slate-700">Districts *</p>
          <div className="flex max-h-48 flex-wrap gap-2 overflow-auto rounded-2xl border border-slate-200 p-3">
            {districts.map(({ state, district }) => {
              const current = application.serviceArea.districtsByState?.[state] ?? [];
              const on = current.includes(district);
              return (
                <button
                  key={`${state}-${district}`}
                  type="button"
                  disabled={disabled}
                  className={cn('rounded-full px-3 py-1 text-xs font-semibold', on ? 'bg-forest-700 text-white' : 'bg-slate-100 text-slate-600')}
                  onClick={() => setArea({ districtsByState: { ...application.serviceArea.districtsByState, [state]: toggle(current, district) } })}
                >
                  {district}
                </button>
              );
            })}
          </div>
        </div>
        <Field id="pins" label="PIN codes (CSV)" hint="6-digit codes, comma or newline separated">
          <Textarea id="pins" disabled={disabled} value={(application.serviceArea.pinCodes ?? []).join(', ')} onChange={(e) => setArea({ pinCodes: e.target.value.split(/[\s,;]+/).filter(Boolean) })} />
        </Field>
        <ChipSelect label="Languages" options={STAFF_LANGUAGES} selected={application.serviceArea.languages ?? []} onToggle={(value) => setArea({ languages: toggle(application.serviceArea.languages ?? [], value) })} />
      </div>
    );
  }

  if (step === 'bank') {
    const ifsc = (application.bank.ifsc ?? '').toUpperCase();
    const known = ifsc.length === 11 ? lookupIfsc(ifsc) : undefined;
    const mismatch = application.bank.accountHolderName && application.businessDetails.legalName && !namesLooselyMatch(application.bank.accountHolderName, application.businessDetails.legalName) && !(application.businessDetails.tradeName && namesLooselyMatch(application.bank.accountHolderName, application.businessDetails.tradeName));
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <h2 className="col-span-full text-lg font-bold">Bank details</h2>
        <p className="col-span-full rounded-xl bg-solar-50 px-3 py-2 text-sm text-solar-900">Penny-drop verification is simulated in demo mode.</p>
        <Field id="holder" label="Account holder name *" error={mismatch ? 'Does not closely match legal / trade name' : undefined}>
          <Input id="holder" disabled={disabled} value={application.bank.accountHolderName ?? ''} onChange={(e) => setBank({ accountHolderName: e.target.value })} />
        </Field>
        <Field id="ifsc" label="IFSC *" hint={known ? `${known.bank} · ${known.branch}` : ifsc.length === 11 ? 'Unknown IFSC — will be verified manually' : undefined}>
          <Input id="ifsc" disabled={disabled} className="uppercase" value={application.bank.ifsc ?? ''} onChange={(e) => setBank({ ifsc: e.target.value.toUpperCase() })} />
        </Field>
        <Field id="acct" label="Account number *" hint={application.bank.accountNumberLast4 ? `Saved as XXXXXX${application.bank.accountNumberLast4}` : '9–18 digits'}>
          <Input id="acct" disabled={disabled} inputMode="numeric" onChange={(e) => setBank({ accountNumber: e.target.value } as ProviderApplication['bank'])} />
        </Field>
        <Field id="acctType" label="Account type *">
          <Select id="acctType" disabled={disabled} value={application.bank.accountType ?? ''} onChange={(e) => setBank({ accountType: e.target.value as 'Current' | 'Savings' })}>
            <option value="">Select</option>
            {ACCOUNT_TYPES.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </Select>
        </Field>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Primary contact & declarations</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="sigName" label="Authorised signatory *">
          <Input id="sigName" disabled={disabled} value={application.contact.signatoryName ?? ''} onChange={(e) => setContact({ signatoryName: e.target.value })} />
        </Field>
        <Field id="sigDesig" label="Designation *">
          <Input id="sigDesig" disabled={disabled} value={application.contact.designation ?? ''} onChange={(e) => setContact({ designation: e.target.value })} />
        </Field>
        <Field id="sigMobile" label="Mobile *">
          <Input id="sigMobile" disabled={disabled} value={application.contact.mobile ?? ''} onChange={(e) => setContact({ mobile: e.target.value })} />
        </Field>
        <Field id="sigEmail" label="Email *">
          <Input id="sigEmail" type="email" disabled={disabled} value={application.contact.email ?? ''} onChange={(e) => setContact({ email: e.target.value })} />
        </Field>
        <Field id="aadhaar" label="Aadhaar last 4 (optional)">
          <Input id="aadhaar" disabled={disabled} maxLength={4} value={application.contact.aadhaarLast4 ?? ''} onChange={(e) => setContact({ aadhaarLast4: e.target.value.replace(/\D/g, '').slice(0, 4) })} />
        </Field>
      </div>
      <Checkbox id="d1" checked={Boolean(application.declarations.informationTrue)} onChange={(checked) => setDecl({ informationTrue: checked })} label="The information given is true and complete" />
      <Checkbox id="d2" checked={Boolean(application.declarations.agreeTerms)} onChange={(checked) => setDecl({ agreeTerms: checked })} label="I agree to SolarMitra partner terms and code of conduct" />
      <Checkbox id="d3" checked={Boolean(application.declarations.agreeStandards)} onChange={(checked) => setDecl({ agreeStandards: checked })} label="I agree to MNRE / DISCOM installation standards" />
      <Checkbox id="d4" checked={Boolean(application.declarations.consentVerification)} onChange={(checked) => setDecl({ consentVerification: checked })} label="I consent to verification of documents and references" />
      <Checkbox id="d5" checked={application.declarations.notBlacklisted !== false} onChange={(checked) => setDecl({ notBlacklisted: checked })} label="We have not been blacklisted by any DISCOM or government agency" />
      {application.declarations.notBlacklisted === false && (
        <Field id="bl" label="Please explain">
          <Textarea id="bl" disabled={disabled} value={application.declarations.blacklistingExplanation ?? ''} onChange={(e) => setDecl({ blacklistingExplanation: e.target.value })} />
        </Field>
      )}
      <Field id="sign" label="Digital signature (type full name) *">
        <Input id="sign" disabled={disabled} value={application.declarations.signatureName ?? ''} onChange={(e) => setDecl({ signatureName: e.target.value })} />
      </Field>
    </div>
  );
}

function AddressFields({ value, onChange, disabled }: { value: NonNullable<ProviderApplication['businessDetails']['registeredAddress']>; onChange: (value: NonNullable<ProviderApplication['businessDetails']['registeredAddress']>) => void; disabled: boolean }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field id="line1" label="Line 1">
        <Input id="line1" disabled={disabled} value={value.line1 ?? ''} onChange={(e) => onChange({ ...value, line1: e.target.value })} />
      </Field>
      <Field id="city" label="City">
        <Input id="city" disabled={disabled} value={value.city ?? ''} onChange={(e) => onChange({ ...value, city: e.target.value })} />
      </Field>
      <Field id="state" label="State / UT">
        <Select id="state" disabled={disabled} value={value.state ?? ''} onChange={(e) => onChange({ ...value, state: e.target.value, district: '' })}>
          <option value="">Select</option>
          {INDIA_REGIONS.map((region) => (
            <option key={region.code} value={region.name}>{region.name}</option>
          ))}
        </Select>
      </Field>
      <Field id="district" label="District">
        <Select id="district" disabled={disabled} value={value.district ?? ''} onChange={(e) => onChange({ ...value, district: e.target.value })}>
          <option value="">Select</option>
          {(INDIA_REGIONS.find((region) => region.name === value.state)?.districts ?? []).map((district) => (
            <option key={district} value={district}>{district}</option>
          ))}
        </Select>
      </Field>
      <Field id="pin" label="PIN">
        <Input id="pin" disabled={disabled} inputMode="numeric" maxLength={6} value={value.pin ?? ''} onChange={(e) => onChange({ ...value, pin: e.target.value })} />
      </Field>
    </div>
  );
}

function ChipSelect({ label, options, selected, onToggle }: { label: string; options: string[]; selected: string[]; onToggle: (value: string) => void }) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-slate-700">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className={cn('rounded-full px-3 py-1 text-xs font-semibold', selected.includes(option) ? 'bg-forest-700 text-white' : 'bg-slate-100 text-slate-600')}
            onClick={() => onToggle(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function NumField({ id, label, value, onChange, disabled }: { id: string; label: string; value?: number; onChange: (value: number) => void; disabled: boolean }) {
  return (
    <Field id={id} label={label}>
      <Input id={id} type="number" disabled={disabled} value={value ?? ''} onChange={(e) => onChange(Number(e.target.value))} />
    </Field>
  );
}

function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function DocumentPanel({ application, onChange }: { application: ProviderApplication; onChange: (application: ProviderApplication) => void }) {
  const types = Object.keys(DOCUMENT_TYPE_LABELS) as DocumentType[];
  return (
    <Card className="p-4">
      <h2 className="text-sm font-bold">Uploads</h2>
      <ul className="mt-3 space-y-2">
        {types.map((type) => {
          const docs = application.documents.filter((document) => document.type === type);
          return (
            <li key={type} className="text-sm">
              <div className="flex items-center justify-between gap-2">
                <span>{DOCUMENT_TYPE_LABELS[type]}</span>
                <label className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-forest-700">
                  <Upload className="h-3 w-3" aria-hidden="true" />
                  Add
                  <input
                    type="file"
                    className="sr-only"
                    accept="application/pdf,image/jpeg,image/png"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      event.target.value = '';
                      if (!file) return;
                      try {
                        onChange(await uploadProviderDocument(type, file));
                        toast.success('Uploaded');
                      } catch (err) {
                        toast.error(getErrorMessage(err, 'Upload failed'));
                      }
                    }}
                  />
                </label>
              </div>
              {docs.map((document) => (
                <p key={document.id} className="mt-1 flex items-center justify-between text-xs text-slate-500">
                  {document.fileName}
                  <button
                    type="button"
                    className="text-red-600"
                    aria-label={`Remove ${document.fileName}`}
                    onClick={async () => {
                      try {
                        onChange(await deleteProviderDocument(document.id));
                      } catch (err) {
                        toast.error(getErrorMessage(err));
                      }
                    }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </p>
              ))}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function ReviewPane({ application, onEdit }: { application: ProviderApplication; onEdit: (index: number) => void }) {
  const blocks: { title: string; index: number; rows: [string, string][] }[] = [
    {
      title: 'Business',
      index: 0,
      rows: [
        ['Legal name', application.businessDetails.legalName ?? '—'],
        ['Type', application.businessDetails.businessType ?? '—'],
        ['State', application.businessDetails.registeredAddress?.state ?? '—'],
      ],
    },
    {
      title: 'Statutory',
      index: 1,
      rows: [
        ['GSTIN', application.statutory.gstin ?? '—'],
        ['PAN', application.statutory.pan ?? '—'],
      ],
    },
    {
      title: 'Credentials',
      index: 2,
      rows: [
        ['Licence', application.credentials.electricalLicenceNo ?? '—'],
        ['Valid till', application.credentials.electricalLicenceValidTill ?? '—'],
      ],
    },
    {
      title: 'Experience',
      index: 3,
      rows: [
        ['Years', String(application.experience.yearsExperience ?? '—')],
        ['Installations', String(application.experience.totalInstallations ?? '—')],
      ],
    },
  ];
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Review & submit</h2>
      <p className="text-sm text-slate-600">Completeness {application.completeness}%. Missing: {application.missing.slice(0, 6).join(', ') || 'none'}.</p>
      {blocks.map((block) => (
        <div key={block.title} className="rounded-2xl bg-slate-50 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-semibold">{block.title}</h3>
            <Button variant="ghost" size="sm" onClick={() => onEdit(block.index)}>Edit</Button>
          </div>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            {block.rows.map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-slate-500">{label}</dt>
                <dd className="font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}
