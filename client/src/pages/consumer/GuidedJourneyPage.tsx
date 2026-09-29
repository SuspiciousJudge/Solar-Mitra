import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, ChevronDown, Sun } from 'lucide-react';
import { BillUploadCard } from '@/components/consumer/BillUploadCard';
import { StickyActions } from '@/components/consumer/StickyActions';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, Input, Select } from '@/components/ui/input';
import { useConsumer } from '@/context/ConsumerContext';
import { useLanguage } from '@/context/LanguageContext';
import { STATES } from '@/data/states';
import { journeyCopy } from '@/i18n/translations';
import { createAudit } from '@/services/auditService';
import { getErrorMessage } from '@/services/api';
import { submitApplication } from '@/services/applicationService';
import { fetchVendors } from '@/services/vendorService';
import type { BillData, Language, Vendor } from '@/types';
import { DEMO_FINANCING, DEMO_POLICY } from '@/utils/policyConfig';
import { calculateCO2Impact, calculateLoanSummary, calculateMarketCost, calculateMonthlyGeneration, calculateMonthlySavings, calculateSolarRequirement, calculateSubsidy } from '@/utils/solarCalculator';
import { formatINR, formatNumber } from '@/utils/format';

const DRAFT_KEY = 'solarmitra.guided-draft';
const JOURNEY_STEP_EVENT = 'solarmitra:guided-step';
type Draft = {
  step: number; source: 'manual' | 'ocr-demo'; state: string; units: string; bill: string; name: string; consumer: string; discom: string; meter: string; connection: string; load: string; period: string;
  phone: string; alternate: string; email: string; dob: string; ownership: string; permission: boolean; address1: string; address2: string; city: string; district: string; propertyState: string; pin: string; roof: string; roofArea: string; shaded: string;
  docType: string; systemKW: number; sizeChoice: string; battery: string; payment: string; tenure: number; vendorId: string; preferredDate: string; preferredTime: string; note: string; consent1: boolean; consent2: boolean;
};
function demoDefaults(language: Language): Draft {
  const c = journeyCopy[language];
  return { step: 0, source: 'manual', state: 'Uttar Pradesh', units: '350', bill: '2800', name: 'Demo Household', consumer: 'DEMO-0001', discom: 'Demo DISCOM', meter: 'DEMO-METER-01', connection: 'Residential', load: '5', period: 'Current billing period', phone: '9876543210', alternate: '', email: 'demo@example.test', dob: '1990-01-01', ownership: c.ownerOptions.split(',')[0], permission: true, address1: 'Demo Solar Street', address2: '', city: 'Kanpur', district: 'Kanpur Nagar', propertyState: 'Uttar Pradesh', pin: '208001', roof: c.roofOptions.split(',')[0], roofArea: '500', shaded: c.shadeOptions.split(',')[0], docType: c.otherId, systemKW: 3, sizeChoice: c.preferenceOptions.split(',')[0], battery: c.yesNoMaybe.split(',')[1], payment: 'financing', tenure: 36, vendorId: '', preferredDate: '', preferredTime: '', note: '', consent1: false, consent2: false };
}
function restoreDraft(defaults: Draft): Draft {
  try {
    const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? '{}') as Partial<Draft>;
    const merged = { ...defaults, ...Object.fromEntries(Object.entries(saved).filter(([, value]) => value !== '' && value !== undefined)) } as Draft;
    return { ...merged, docType: defaults.docType };
  } catch { return defaults; }
}

export function GuidedJourneyPage() {
  const { language, setLanguage, t } = useLanguage();
  const c = journeyCopy[language];
  const navigate = useNavigate();
  const consumer = useConsumer();
  const [d, setD] = useState<Draft>(() => {
    const saved = restoreDraft(demoDefaults(language));
    if (!saved.state && consumer.billData) return { ...saved, state: consumer.billData.state, units: String(consumer.billData.monthlyUnits), bill: consumer.billData.monthlyBill ? String(consumer.billData.monthlyBill) : '', source: consumer.billData.source };
    return saved;
  });
  const [docNumber, setDocNumber] = useState('DEMO-ID-001');
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const update = (patch: Partial<Draft>) => {
    setD((prev) => ({ ...prev, ...patch }));
    if (patch.step !== undefined) window.dispatchEvent(new CustomEvent(JOURNEY_STEP_EVENT, { detail: patch.step }));
  };
  useEffect(() => {
    const { docType: _type, dob: _dateOfBirth, ...safeDraft } = d;
    localStorage.setItem(DRAFT_KEY, JSON.stringify(safeDraft));
  }, [d]);
  const steps = c.steps.split(',');
  const units = Number(d.units);
  const bill = d.bill.trim() === '' ? undefined : Number(d.bill);
  const recommendation = useMemo(() => d.state && Number.isFinite(units) && units >= 0 ? calculateSolarRequirement(units) : null, [d.state, units]);
  const suggestedKW = Math.max(1, recommendation?.recommendedKW ?? 1);
  const kw = Math.max(1, Math.min(DEMO_POLICY.maxRecommendedKW, d.systemKW || suggestedKW));
  const cost = calculateMarketCost(kw);
  const subsidy = calculateSubsidy(kw, d.state, cost);
  const contribution = Math.max(0, cost - subsidy.totalSubsidy);
  const monthlyGen = calculateMonthlyGeneration(kw);
  const savings = calculateMonthlySavings(Math.max(0, Number.isFinite(units) ? units : 0), bill, monthlyGen);
  const annualSavings = savings * 12;
  const impact = calculateCO2Impact(kw, monthlyGen);
  const currentBill = bill || Math.round(Math.max(0, units) * DEMO_POLICY.fallbackTariffPerUnit);
  const afterBill = Math.max(0, currentBill - savings);
  const loanAmount = d.payment === 'upfront' ? 0 : contribution;
  const loan = calculateLoanSummary(loanAmount, DEMO_FINANCING.annualInterestRate, d.tenure);
  const options = (key: string) => c[key].split(',');
  const label = (text: string, id: string, child: ReactNode, hint?: string) => <Field id={id} label={text} hint={hint}>{child}</Field>;
  const textInput = (key: keyof Draft, title: string, type = 'text', hint?: string) => label(title, String(key), <Input id={String(key)} type={type} value={String(d[key] ?? '')} onChange={(e) => update({ [key]: e.target.value } as Partial<Draft>)} />, hint);
  const selectInput = (key: keyof Draft, title: string, values: string[], placeholder?: string) => label(title, String(key), <Select id={String(key)} value={String(d[key] ?? '')} onChange={(e) => update({ [key]: e.target.value } as Partial<Draft>)}><option value="">{placeholder ?? '—'}</option>{values.map((v) => <option key={v} value={v}>{v}</option>)}</Select>);
  const moneyRow = (name: string, value: number, prominent = false) => <div className={`flex items-center justify-between gap-3 py-2 ${prominent ? 'border-t border-slate-200 text-base font-extrabold' : 'text-sm'}`}><span>{name}</span><span className="tabular-nums">{formatINR(Number.isFinite(value) ? value : 0)}</span></div>;

  useEffect(() => {
    if (d.step === 6 && d.state) void fetchVendors({ state: d.state, active: true }).then((result) => {
      setVendors(result.vendors);
      if (!d.vendorId && result.vendors[0]) update({ vendorId: result.vendors[0].id });
    }).catch(() => setVendors([]));
  }, [d.step, d.state]);

  const changeStep = async (next: number) => {
    setError('');
    if (next === 1) {
      if (!d.state || !Number.isFinite(units) || units < 0 || units > 20000 || (bill !== undefined && (!Number.isFinite(bill) || bill < 0 || bill > 1_000_000))) { setError(c.required); return; }
      const billData: BillData = { state: d.state, monthlyUnits: Math.round(units), monthlyBill: Math.round(bill ?? 0), source: d.source };
      consumer.setBillData(billData);
      setBusy(true);
      try { const result = await createAudit(billData); consumer.setAuditId(result.auditId); }
      catch (e) { setError(getErrorMessage(e, c.apiError)); setBusy(false); return; }
      setBusy(false);
    }
    const validId = d.docType === c.aadhaar ? /^\d{12}$/.test(docNumber.replace(/\s/g, '')) : d.docType === c.pan ? /^[A-Za-z]{5}\d{4}[A-Za-z]$/.test(docNumber) : docNumber.trim().length >= 3;
    if (next === 2 && (!d.name.trim() || !/^[6-9]\d{9}$/.test(d.phone.replace(/\D/g, '')) || !d.dob || !validId)) { setError(!/^[6-9]\d{9}$/.test(d.phone.replace(/\D/g, '')) ? c.invalidPhone : c.required); return; }
    if (next === 3 && (!d.ownership || !d.address1.trim() || !d.city.trim() || !d.propertyState || !/^\d{6}$/.test(d.pin) || (d.ownership === options('ownerOptions')[2] && !d.permission))) { setError(c.required); return; }
    if (next === 6 && d.payment === 'financing' && !d.tenure) { setError(c.required); return; }
    if (next === 7 && !d.vendorId) { setError(c.required); return; }
    update({ step: Math.max(0, Math.min(7, next)), ...(next === 1 ? { systemKW: suggestedKW, propertyState: d.propertyState || d.state } : {}) });
  };

  const extracted = (values: { state: string; monthlyUnits: number; monthlyBill: number }) => {
    update({ state: values.state, units: String(values.monthlyUnits), bill: String(values.monthlyBill), source: 'ocr-demo' });
  };

  const submit = async () => {
    if (!d.consent1 || !d.consent2 || !consumer.selectedVendor && !d.vendorId) { setError(c.required); return; }
    const vendor = vendors.find((v) => v.id === d.vendorId) ?? consumer.selectedVendor;
    if (!vendor) { setError(c.required); return; }
    setBusy(true);
    try {
      const billData: BillData = { state: d.state, monthlyUnits: Math.round(units), monthlyBill: Math.round(bill ?? 0), source: d.source };
      consumer.setBillData(billData);
      consumer.selectVendor(vendor);
      consumer.setApplicant({ name: d.name, phone: d.phone, location: d.city });
      const result = await submitApplication({ applicantName: d.name, phone: d.phone, location: `${d.city}, ${d.propertyState}`, state: d.state, monthlyUnits: Math.round(units), monthlyBill: Math.round(bill ?? 0), auditId: consumer.auditId, vendorId: vendor.id, loanAmount, interestRate: DEMO_FINANCING.annualInterestRate, tenureMonths: d.payment === 'upfront' ? 0 : d.tenure, selectedKW: kw, preferredDate: d.preferredDate, preferredTime: d.preferredTime, note: d.note, consentGiven: true, journey: { electricity: { consumerName: d.name, consumerNumber: d.consumer, discom: d.discom, meterNumber: d.meter, connectionType: d.connection, sanctionedLoad: d.load, billingPeriod: d.period }, personal: { alternateMobile: d.alternate, email: d.email, dateOfBirth: d.dob, preferredLanguage: language }, kyc: { documentType: d.docType, documentStatus: 'demo-collection-only' }, property: { ownership: d.ownership, permission: d.permission, addressLine1: d.address1, addressLine2: d.address2, city: d.city, district: d.district, state: d.propertyState, pinCode: d.pin, roofType: d.roof, roofArea: d.roofArea ? Number(d.roofArea) : undefined, shaded: d.shaded }, solar: { batteryPreference: d.battery, paymentPreference: d.payment }, booking: { preferredDate: d.preferredDate, preferredTime: d.preferredTime, note: d.note, consentGiven: true } } });
      consumer.setApplication(result); localStorage.removeItem(DRAFT_KEY); navigate('/consumer/application-success');
    } catch (e) { toast.error(getErrorMessage(e, c.apiError)); }
    finally { setBusy(false); }
  };

  const renderStep = () => {
    switch (d.step) {
      case 0: return <div className="space-y-4"><BillUploadCard onExtracted={extracted} completed={d.source === 'ocr-demo'} />{d.source === 'ocr-demo' && <p className="rounded-xl bg-forest-50 p-3 text-sm text-forest-800">{c.verify}</p>}<div className="grid gap-3 sm:grid-cols-2">{textInput('name', c.name)}{textInput('consumer', c.consumer || c.consumer)}{textInput('discom', c.discom || c.discom)}{textInput('meter', c.meter)}{textInput('connection', c.connection)}{textInput('load', c.load, 'number')}{textInput('period', c.period)}{selectInput('state', 'State', [...STATES])}{textInput('units', c.units, 'number')}{textInput('bill', c.bill, 'number')}</div><button type="button" className="text-sm font-semibold text-forest-700 underline" onClick={() => update({ source: 'manual' })}>{c.manual}</button></div>;
      case 1: return <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2">{textInput('name', c.name)}{textInput('phone', c.mobile, 'tel')}{textInput('alternate', c.alternate, 'tel')}{textInput('email', c.email, 'email')}{textInput('dob', c.dob, 'date')}{label(c.language, 'preferred-language', <Select id="preferred-language" value={language} onChange={(e) => setLanguage(e.target.value as Language)}>{[['en','English'],['hi','हिंदी'],['gu','ગુજરાતી'],['ta','தமிழ்']].map(([v,n]) => <option value={v} key={v}>{n}</option>)}</Select>)}{selectInput('docType', c.kyc, [c.aadhaar,c.pan,c.otherId])}{label(c.idNumber, 'id-number', <Input id="id-number" type="password" autoComplete="off" value={docNumber} onChange={(e) => setDocNumber(e.target.value)} />)}<label className="block text-sm font-semibold text-slate-700">{c.kyc} document (optional)<Input className="mt-1.5" type="file" accept="image/*,.pdf" /></label></div><p className="rounded-xl bg-solar-50 p-3 text-sm text-solar-900">{c.demoKyc}</p>{docNumber.length > 4 && <p className="text-sm text-slate-600">•••• {docNumber.slice(-4)}</p>}</div>;
      case 2: return <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2">{selectInput('ownership', c.owner, options('ownerOptions'))}{d.ownership === options('ownerOptions')[2] && <label className="flex items-center gap-3 rounded-xl border p-3 text-sm"><input type="checkbox" checked={d.permission} onChange={(e) => update({ permission: e.target.checked })} />{c.permission}</label>}{textInput('address1', c.address1)}{textInput('address2', c.address2)}{textInput('city', c.city)}{textInput('district', c.district)}{selectInput('propertyState', 'State', [...STATES])}{textInput('pin', c.pin, 'text')}{selectInput('roof', c.roof, options('roofOptions'))}{textInput('roofArea', c.area, 'number')}{selectInput('shaded', c.shade, options('shadeOptions'))}</div><p className="text-sm text-slate-600">{c.photos}</p><div className="grid gap-3 sm:grid-cols-3">{['Roof photo','Meter photo','Electrical panel photo'].map((x) => <label key={x} className="rounded-xl border border-dashed p-3 text-sm">{x}<Input className="mt-2" type="file" accept="image/*" /></label>)}</div></div>;
      case 3: return <div className="space-y-4"><Card className="bg-forest-50 p-5"><p className="text-sm text-forest-700">{c.recommended} {suggestedKW} kW.</p><p className="mt-1 text-3xl font-black text-forest-900">{formatNumber(units)} kWh/month</p></Card><div className="grid gap-3 sm:grid-cols-2">{label(c.sizePreference, 'sizeChoice', <Select id="sizeChoice" value={d.sizeChoice} onChange={(e) => { const choice = e.target.value; update({ sizeChoice: choice, systemKW: choice === options('preferenceOptions')[1] ? Math.max(1, suggestedKW - 1) : choice === options('preferenceOptions')[2] ? Math.min(DEMO_POLICY.maxRecommendedKW, suggestedKW + 1) : suggestedKW }); }}>{options('preferenceOptions').map((v) => <option key={v}>{v}</option>)}</Select>)}{label(c.system, 'system-size', <Input id="system-size" type="number" min={1} max={DEMO_POLICY.maxRecommendedKW} value={kw} onChange={(e) => update({ systemKW: Number(e.target.value) })} />)}{selectInput('battery', c.battery, options('yesNoMaybe'))}{selectInput('payment', c.payment, options('paymentOptions'))}</div><p className="text-sm text-slate-600">{c.batteryNote}</p></div>;
      case 4: return <div className="space-y-4"><Card className="p-5"><div className="flex items-center gap-2 text-forest-800"><Sun aria-hidden="true"/><h2 className="font-bold">{c.title5}: {kw} kW</h2></div><p className="mt-1 text-sm text-slate-600">{c.recommended} {suggestedKW} kW · {formatNumber(units)} kWh/month</p><details className="mt-4 rounded-xl bg-slate-50 p-3"><summary className="cursor-pointer font-semibold">{c.why}</summary><div className="mt-2 text-sm"><p>This estimate relates your monthly consumption to estimated solar generation.</p><details className="mt-2"><summary className="cursor-pointer">{c.methodology}</summary><p>{t('policyText')}</p></details></div></details><h3 className="mt-4 font-bold">{c.compare}</h3><div className="mt-2 flex gap-2 overflow-x-auto pb-2">{[Math.max(1, suggestedKW - 1), suggestedKW, Math.min(DEMO_POLICY.maxRecommendedKW, suggestedKW + 1)].filter((v,i,a) => a.indexOf(v) === i).map((size) => { const sc = calculateMarketCost(size); const ss = calculateSubsidy(size, d.state, sc); const sg = calculateMonthlyGeneration(size); const sv = calculateMonthlySavings(units, bill, sg); return <button type="button" key={size} onClick={() => update({ systemKW: size })} className={`min-w-40 rounded-2xl border p-3 text-left ${kw === size ? 'border-forest-600 bg-forest-50 ring-2 ring-forest-300' : 'border-slate-200'}`} aria-pressed={kw === size}><strong>{size} kW</strong><span className="mt-2 block text-xs">{c.cost}: {formatINR(sc)}</span><span className="block text-xs">{c.central}: {formatINR(ss.centralSubsidy)}</span><span className="block text-xs">{c.stateSupport}: {formatINR(ss.stateSubsidy)}</span><span className="block text-xs">{c.contribution}: {formatINR(Math.max(0,sc-ss.totalSubsidy))}</span><span className="block text-xs">{c.generation}: {formatNumber(sg)}</span><span className="block text-xs">{c.savings}: {formatINR(sv)}</span></button>; })}</div>{moneyRow(c.cost,cost)}{moneyRow(c.central,subsidy.centralSubsidy)}{moneyRow(c.stateSupport,subsidy.stateSubsidy)}{subsidy.stateSubsidy === 0 && <p className="text-xs text-slate-500">{c.noState}</p>}{moneyRow(c.totalSupport,subsidy.totalSubsidy)}{moneyRow(c.contribution,contribution,true)}<div className="mt-3 grid gap-2 rounded-xl bg-slate-50 p-3 text-sm"><div className="flex justify-between"><span>{c.today}</span><b>{formatINR(currentBill)}</b></div><div className="flex justify-between"><span>{c.after}</span><b>{formatINR(afterBill)}</b></div><div className="flex justify-between"><span>{c.savings}</span><b>{formatINR(savings)}</b></div><div className="flex justify-between"><span>{c.annual}</span><b>{formatINR(annualSavings)}</b></div><div className="flex justify-between"><span>{c.generation}</span><b>{formatNumber(monthlyGen)} kWh</b></div><div className="flex justify-between"><span>{t('climateTitle')}</span><b>{impact.estimatedCO2OffsetTonnes} t CO₂ · {impact.equivalentTrees} {t('trees')}</b></div>{annualSavings > 0 && <div className="flex justify-between"><span>{c.payback}</span><b>{(contribution / annualSavings).toFixed(1)} years</b></div>}</div></Card><p className="rounded-xl bg-solar-50 p-3 text-xs leading-relaxed">{c.cap}<br/>{c.subsidyDisclaimer}</p><p className="text-sm text-slate-600">Electricity savings are separate from subsidy and are estimates. {c.status}</p></div>;
      case 5: return <div className="space-y-4"><Card className="p-5">{moneyRow(c.cost,cost)}{moneyRow(c.central,-subsidy.centralSubsidy)}{moneyRow(c.stateSupport,-subsidy.stateSubsidy)}{moneyRow(c.contribution,contribution,true)}<div className="mt-4 grid gap-3 sm:grid-cols-2">{label(c.payment,'pay-choice',<Select id="pay-choice" value={d.payment} onChange={(e) => update({ payment: e.target.value })}>{[['upfront',c.upfront],['financing',c.paymentOptions.split(',')[1]],['unsure',c.paymentOptions.split(',')[2]]].map(([v,l])=><option key={v} value={v}>{l}</option>)}</Select>)}{d.payment !== 'upfront' && label(c.tenure,'tenure',<Select id="tenure" value={d.tenure} onChange={(e) => update({ tenure: Number(e.target.value) })}>{[12,24,36].map((v)=><option value={v} key={v}>{v} {t('months')}</option>)}</Select>)}</div>{d.payment !== 'upfront' && <><div className="grid grid-cols-3 gap-2">{[12,24,36].map((months) => { const summary = calculateLoanSummary(contribution, DEMO_FINANCING.annualInterestRate, months); return <button type="button" key={months} aria-pressed={d.tenure === months} onClick={() => update({ tenure: months })} className={`rounded-xl border p-3 text-center text-xs ${d.tenure === months ? 'border-forest-600 bg-forest-50 ring-2 ring-forest-200' : 'border-slate-200'}`}><b>{months} {t('months')}</b><span className="mt-1 block">{c.emi}: {formatINR(summary.emi)}</span><span className="block">{c.interest}: {formatINR(summary.totalInterest)}</span></button>; })}</div><div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center text-sm"><div><small>{c.emi}</small><b className="block">{formatINR(loan.emi)}</b></div><div><small>{c.repayment}</small><b className="block">{formatINR(loan.totalRepayment)}</b></div><div><small>{c.interest}</small><b className="block">{formatINR(loan.totalInterest)}</b></div></div></>}</Card><p className="rounded-xl bg-solar-50 p-3 text-xs">{c.financingDisclaimer}</p></div>;
      case 6: return <div className="space-y-4">{vendors.length ? vendors.map((v) => <button type="button" key={v.id} onClick={() => update({ vendorId: v.id })} className={`w-full rounded-2xl border p-4 text-left ${d.vendorId === v.id ? 'border-forest-600 bg-forest-50 ring-2 ring-forest-200' : 'border-slate-200'}`} aria-pressed={d.vendorId === v.id}><span className="font-bold">{v.name}</span><span className="block text-sm text-slate-600">{v.location} · {v.state}</span><span className="mt-1 inline-block rounded-full bg-forest-100 px-2 py-1 text-xs">{v.verified ? 'Verified' : 'Verification status unavailable'}</span></button>) : <p className="rounded-xl bg-slate-50 p-4 text-sm">Installer list unavailable. Please retry or continue later.</p>}<div className="grid gap-3 sm:grid-cols-2">{textInput('preferredDate', c.date, 'date')}{textInput('preferredTime', c.time, 'time')}{textInput('note', c.note)}</div>{label(c.confirmAddress,'install-address',<Input id="install-address" value={[d.address1,d.address2,d.city,d.district,d.propertyState,d.pin].filter(Boolean).join(', ')} readOnly />)}</div>;
      default: return <div className="space-y-3">{[[steps[0], `${d.name || '—'} · ${d.consumer || '—'} · ${d.state} · ${d.units} kWh · ${d.bill || '—'}`],[steps[1],`${d.name} · ${d.phone} · ${d.email || '—'} · ${d.docType} •••• ${docNumber.slice(-4) || '—'}`],[steps[2],`${d.ownership} · ${d.address1}, ${d.city}, ${d.propertyState} ${d.pin} · ${d.roof || '—'} · ${d.roofArea || '—'} sq ft`],[steps[4],`${kw} kW · ${formatINR(cost)} · central ${formatINR(subsidy.centralSubsidy)} · state ${formatINR(subsidy.stateSubsidy)} · pay ${formatINR(contribution)} · saving ${formatINR(savings)}/month`],[steps[5],d.payment === 'upfront' ? c.upfront : `${d.tenure} months · EMI ${formatINR(loan.emi)} · ${c.interest}: ${formatINR(loan.totalInterest)}`],[steps[6],`${vendors.find((v) => v.id === d.vendorId)?.name ?? '—'} · ${d.preferredDate || '—'}`]].map(([heading, detail], i) => <details key={heading} className="rounded-2xl border p-4" open><summary className="flex cursor-pointer list-none items-center justify-between font-bold">{heading}<span className="text-sm font-semibold text-forest-700">Edit step {i + 1}</span><ChevronDown className="h-4 w-4" /></summary><p className="mt-2 text-sm text-slate-600">{detail}</p><button type="button" className="mt-2 text-sm font-semibold text-forest-700 underline" onClick={() => update({ step: [0,1,2,4,5,6][i] })}>Edit</button></details>)}<label className="flex gap-3 rounded-xl border p-3 text-sm"><input type="checkbox" checked={d.consent1} onChange={(e) => update({ consent1:e.target.checked })}/>{c.customer}</label><label className="flex gap-3 rounded-xl border p-3 text-sm"><input type="checkbox" checked={d.consent2} onChange={(e) => update({ consent2:e.target.checked })}/>{c.approval}</label></div>;
    }
  };

  return <>
    <main className="space-y-4 px-5 pb-28 pt-5">
      <div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wide text-forest-700">{t('progressLabel', { current: d.step + 1, total: 8 })} · {steps[d.step]}</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuemin={1} aria-valuemax={8} aria-valuenow={d.step + 1} aria-label={`Step ${d.step + 1} of 8`}><div className="h-full rounded-full bg-forest-600 transition-all" style={{ width: `${((d.step + 1) / 8) * 100}%` }}/></div>
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{c[`title${d.step + 1}`]}</h1>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
      {renderStep()}
    </main>
    <StickyActions><div className="flex gap-2">{d.step > 0 && <Button type="button" variant="outline" size="xl" className="w-28" onClick={() => changeStep(d.step - 1)}><ArrowLeft className="h-4 w-4"/> {c.back}</Button>}{d.step < 7 ? <Button type="button" size="xl" className="flex-1" loading={busy} onClick={() => changeStep(d.step + 1)}>{c.next}<ArrowRight className="h-5 w-5"/></Button> : <Button type="button" size="xl" variant="solar" className="flex-1" loading={busy} onClick={submit}>{c.submit}</Button>}</div></StickyActions>
  </>;
}
