/**
 * Seeded provider accounts and onboarding applications (demo only).
 * GSTIN / PAN values are synthetic and only used because they pass format + checksum checks.
 */
import { encryptSecret } from '../utils/secretBox';
import { PLACEHOLDER_PDF, PLACEHOLDER_PNG, writeDocumentFile } from '../services/documentStore';
import type { ProviderApplication, ProviderDocument } from '../types/provider';
import type { UserRecord, Vendor } from '../types';
import {
  collectSelfRiskFlags,
  emptyChecklist,
  makeGstin,
  type ChecklistKey,
  type ProviderStatus,
  type RiskFlagKey,
} from '../validators/providerRules';
import { completenessOf } from '../services/providerCompleteness';

export const DEMO_PROVIDER_PASSWORD = 'demo123';

export interface SeedProviderUser {
  id: string;
  name: string;
  email: string;
  password: string;
  mobile: string;
  providerId?: string;
}

export const SEED_PROVIDER_USERS: SeedProviderUser[] = [
  { id: 'U-PRV-NEW', name: 'Asha Verma', email: 'provider.new@solarmitra.demo', password: DEMO_PROVIDER_PASSWORD, mobile: '9811100001' },
  { id: 'U-PRV-PEND', name: 'Mehul Shah', email: 'provider.pending@solarmitra.demo', password: DEMO_PROVIDER_PASSWORD, mobile: '9811100002' },
  { id: 'U-PRV-APPR', name: 'Rakesh Tiwari', email: 'provider.approved@solarmitra.demo', password: DEMO_PROVIDER_PASSWORD, mobile: '9811100003', providerId: 'V-001' },
  { id: 'U-PRV-REV', name: 'Lakshmi Iyer', email: 'provider.review@solarmitra.demo', password: DEMO_PROVIDER_PASSWORD, mobile: '9811100004' },
  { id: 'U-PRV-CHG', name: 'Vikram Singh', email: 'provider.changes@solarmitra.demo', password: DEMO_PROVIDER_PASSWORD, mobile: '9811100005' },
  { id: 'U-PRV-RES', name: 'Sneha Kulkarni', email: 'provider.resubmitted@solarmitra.demo', password: DEMO_PROVIDER_PASSWORD, mobile: '9811100006' },
  { id: 'U-PRV-REJ', name: 'Amit Kumar', email: 'provider.rejected@solarmitra.demo', password: DEMO_PROVIDER_PASSWORD, mobile: '9811100007' },
  { id: 'U-PRV-SUS', name: 'Bikash Das', email: 'provider.suspended@solarmitra.demo', password: DEMO_PROVIDER_PASSWORD, mobile: '9811100008', providerId: 'V-201' },
  { id: 'U-PRV-RISK', name: 'Neha Gupta', email: 'provider.risk@solarmitra.demo', password: DEMO_PROVIDER_PASSWORD, mobile: '9811100009' },
  { id: 'U-PRV-LIC', name: 'Farhan Qureshi', email: 'provider.licence@solarmitra.demo', password: DEMO_PROVIDER_PASSWORD, mobile: '9811100002' },
];

function doc(type: ProviderDocument['type'], fileName: string, storedName: string, mime: string, at: string, verification: ProviderDocument['verification'] = 'pending'): ProviderDocument {
  return {
    id: `DOC-${storedName.slice(0, 10)}`,
    type,
    fileName,
    storedName,
    mimeType: mime,
    sizeBytes: mime === 'image/png' ? PLACEHOLDER_PNG.length : PLACEHOLDER_PDF.length,
    uploadedAt: at,
    verification,
  };
}

function passChecklist(overrides: Partial<Record<ChecklistKey, 'pass' | 'fail' | 'pending'>> = {}) {
  const base = emptyChecklist();
  (Object.keys(base) as ChecklistKey[]).forEach((key) => {
    base[key] = { status: overrides[key] ?? 'pending' };
  });
  return base as ProviderApplication['checklist'];
}

function bank(holder: string, account: string, ifsc: string, bankName: string, branch: string) {
  return {
    accountHolderName: holder,
    accountNumberLast4: account.slice(-4),
    accountNumberEncrypted: encryptSecret(account),
    ifsc,
    accountType: 'Current' as const,
    bankName,
    branch,
    ifscUnknown: false,
  };
}

function address(line1: string, city: string, district: string, state: string, pin: string) {
  return { line1, city, district, state, pin };
}

interface SeedDraft {
  id: string;
  userId: string;
  status: ProviderStatus;
  submittedAt?: string;
  decidedAt?: string;
  providerId?: string;
  tier?: 'Standard' | 'Preferred';
  createdAt: string;
  legalName: string;
  tradeName?: string;
  businessType: ProviderApplication['businessDetails']['businessType'];
  principal: { name: string; designation: string; mobile: string; email: string };
  yearEstablished: number;
  city: string;
  district: string;
  state: string;
  pin: string;
  gstin: string;
  pan: string;
  udyam?: string;
  cin?: string;
  llpin?: string;
  licenceTill: string;
  discomEmpanelled: boolean;
  discomName?: string;
  yearsExperience: number;
  installations: number;
  capacityKw: number;
  engineers: number;
  electricians: number;
  installers: number;
  account: string;
  ifsc: string;
  bankName: string;
  branch: string;
  holder?: string;
  phone: string;
  email: string;
  notBlacklisted?: boolean;
  blacklistingExplanation?: string;
  docs: ProviderDocument[];
  assigned?: { userId: string; name: string; at: string };
  changeRequest?: ProviderApplication['changeRequest'];
  rejectReason?: ProviderApplication['rejectReason'];
  suspendReason?: string;
  extraFlags?: RiskFlagKey[];
  checklist?: ProviderApplication['checklist'];
  timeline: ProviderApplication['timeline'];
  website?: string;
}

function build(seed: SeedDraft): ProviderApplication {
  const yearsInBusiness = 2026 - seed.yearEstablished;
  const application: ProviderApplication = {
    id: seed.id,
    userId: seed.userId,
    status: seed.status,
    businessDetails: {
      legalName: seed.legalName,
      tradeName: seed.tradeName,
      businessType: seed.businessType,
      principals: [{ ...seed.principal }],
      yearEstablished: seed.yearEstablished,
      yearsInBusiness,
      registeredAddress: address(seed.city === 'Kanpur' ? '12 Solar Marg' : `14 Green Park`, seed.city, seed.district, seed.state, seed.pin),
      sameAsRegistered: true,
      operationalAddress: address(seed.city === 'Kanpur' ? '12 Solar Marg' : `14 Green Park`, seed.city, seed.district, seed.state, seed.pin),
      website: seed.website ?? 'https://demo.solarmitra.test',
      companyEmail: seed.email,
    },
    statutory: { gstin: seed.gstin, pan: seed.pan, udyam: seed.udyam, cin: seed.cin, llpin: seed.llpin },
    credentials: {
      electricalLicenceNo: `EL-${seed.id.slice(-4)}`,
      electricalLicenceAuthority: `${seed.state} Electrical Inspectorate`,
      electricalLicenceValidTill: seed.licenceTill,
      discomEmpanelled: seed.discomEmpanelled,
      discomNames: seed.discomName ? [seed.discomName] : [],
      empanelmentNo: seed.discomEmpanelled ? `EMP-${seed.id.slice(-4)}` : undefined,
      empanelmentValidTill: seed.discomEmpanelled ? '2027-12-31' : undefined,
      panelBrands: ['Waaree', 'Tata Power Solar'],
      almmListed: true,
      dcrModules: true,
      inverterBrands: ['Growatt', 'Sungrow'],
      certifications: ['ISO 9001'],
    },
    experience: {
      yearsExperience: seed.yearsExperience,
      totalInstallations: seed.installations,
      totalCapacityKw: seed.capacityKw,
      segmentResidential: Math.round(seed.installations * 0.7),
      segmentCommercial: Math.round(seed.installations * 0.2),
      segmentAgricultural: Math.round(seed.installations * 0.05),
      segmentGroupHousing: Math.round(seed.installations * 0.05),
      largestProjectKw: 25,
      typicalSizes: [1, 2, 3, 5],
      engineers: seed.engineers,
      certifiedElectricians: seed.electricians,
      installers: seed.installers,
      serviceStaff: 2,
      capacityPerMonth: 12,
      avgTurnaroundDays: 10,
      afterSalesHours: 24,
      workmanshipWarrantyYears: 5,
      equipmentWarranty: 'Panel 25 years / inverter 10 years pass-through',
      amcOffered: true,
      amcDetails: 'Annual cleaning and health check',
      pricePerKw: { kw1: 62000, kw2: 58000, kw3: 55000, kw5: 52000 },
      references: [
        { name: 'Demo Household One', city: seed.city, systemKw: 3, installationMonth: '2025-11', phone: '9822001101' },
        { name: 'Demo Household Two', city: seed.city, systemKw: 5, installationMonth: '2026-02', phone: '9822001102' },
      ],
    },
    serviceArea: {
      states: [seed.state],
      districtsByState: { [seed.state]: [seed.district] },
      pinCodes: [seed.pin],
      maxRadiusKm: 80,
      languages: ['English', 'Hindi'],
    },
    bank: bank(seed.holder ?? seed.legalName, seed.account, seed.ifsc, seed.bankName, seed.branch),
    contact: {
      signatoryName: seed.principal.name,
      designation: seed.principal.designation,
      mobile: seed.phone,
      email: seed.email,
      aadhaarLast4: '4321',
    },
    declarations: {
      informationTrue: true,
      agreeTerms: true,
      agreeStandards: true,
      consentVerification: true,
      notBlacklisted: seed.notBlacklisted ?? true,
      blacklistingExplanation: seed.blacklistingExplanation,
      signatureName: seed.principal.name,
      signedAt: seed.submittedAt,
      signedIp: '127.0.0.1',
    },
    documents: seed.docs,
    completeness: 0,
    missing: [],
    riskFlags: [],
    checklist: seed.checklist ?? passChecklist(),
    assignedReviewer: seed.assigned,
    timeline: seed.timeline,
    submittedAt: seed.submittedAt,
    decidedAt: seed.decidedAt,
    providerId: seed.providerId,
    tier: seed.tier,
    changeRequest: seed.changeRequest,
    rejectReason: seed.rejectReason,
    suspendReason: seed.suspendReason,
    createdAt: seed.createdAt,
    updatedAt: seed.decidedAt ?? seed.submittedAt ?? seed.createdAt,
  };

  const computed = completenessOf(application);
  application.completeness = computed.score;
  application.missing = computed.missing;
  const flags = collectSelfRiskFlags({
    gstin: application.statutory.gstin,
    pan: application.statutory.pan,
    registeredState: application.businessDetails.registeredAddress?.state,
    businessType: application.businessDetails.businessType,
    legalName: application.businessDetails.legalName,
    tradeName: application.businessDetails.tradeName,
    accountHolderName: application.bank.accountHolderName,
    yearsInBusiness: application.businessDetails.yearsInBusiness,
    yearsExperience: application.experience.yearsExperience,
    totalInstallations: application.experience.totalInstallations,
    engineers: application.experience.engineers,
    installers: application.experience.installers,
    licenceValidTill: application.credentials.electricalLicenceValidTill,
    notBlacklisted: application.declarations.notBlacklisted,
  });
  application.riskFlags = Array.from(new Set([...flags, ...(seed.extraFlags ?? [])]));
  return application;
}

const requiredTypes = ['gst_certificate', 'pan_card', 'electrical_licence', 'cancelled_cheque', 'signatory_id'] as const;

function writePack(prefix: string, at: string, extra: ProviderDocument['type'][] = [], verification: ProviderDocument['verification'] = 'pending'): ProviderDocument[] {
  return [...requiredTypes, ...extra].map((type, index) => {
    const mime = type === 'project_photo' || type === 'signatory_id' ? 'image/png' : 'application/pdf';
    const stored = writeDocumentFile(mime === 'image/png' ? PLACEHOLDER_PNG : PLACEHOLDER_PDF, mime);
    return doc(type, `${prefix}-${type}.${mime === 'image/png' ? 'png' : 'pdf'}`, stored, mime, at, index < 3 && verification === 'verified' ? 'verified' : verification);
  });
}

export function createProviderSeed(): { users: SeedProviderUser[]; applications: ProviderApplication[]; vendors: Vendor[] } {
  const t = (iso: string) => iso;

  const panPropUP = 'AARPA1234Q';
  const panFirmGJ = 'AABFA2345R';
  const panCoTN = 'AABCA3456S';
  const panLlpRJ = 'AABFA4567T';
  const panCoMH = 'AABCA5678U';
  const panPropBR = 'AARPA6789V';
  const panPropAS = 'AARPA7890W';
  const panPropUP2 = 'AARPA8901X';
  const panFirmGJ2 = 'AABFA9012Y';

  const applications: ProviderApplication[] = [
    build({
      id: 'PRV-2026-1001',
      userId: 'U-PRV-NEW',
      status: 'Draft',
      createdAt: t('2026-09-20T08:00:00.000Z'),
      legalName: 'Asha Rooftop Solar',
      tradeName: 'Asha Solar',
      businessType: 'Proprietorship',
      principal: { name: 'Asha Verma', designation: 'Proprietor', mobile: '9811100001', email: 'provider.new@solarmitra.demo' },
      yearEstablished: 2021,
      city: 'Lucknow',
      district: 'Lucknow',
      state: 'Uttar Pradesh',
      pin: '226001',
      gstin: makeGstin('09', panPropUP),
      pan: panPropUP,
      licenceTill: '2027-06-30',
      discomEmpanelled: false,
      yearsExperience: 4,
      installations: 28,
      capacityKw: 90,
      engineers: 1,
      electricians: 2,
      installers: 4,
      account: '12345678901',
      ifsc: 'SBIN0000123',
      bankName: 'State Bank of India',
      branch: 'Lucknow Main',
      phone: '9811100001',
      email: 'provider.new@solarmitra.demo',
      docs: [],
      timeline: [{ status: 'Draft', at: '2026-09-20T08:00:00.000Z', byUserId: 'U-PRV-NEW', byName: 'Asha Verma', role: 'provider', note: 'Account created' }],
    }),
    build({
      id: 'PRV-2026-1002',
      userId: 'U-PRV-PEND',
      status: 'Submitted',
      submittedAt: t('2026-09-28T10:15:00.000Z'),
      createdAt: t('2026-09-12T09:00:00.000Z'),
      legalName: 'Saurashtra Partner Solars',
      tradeName: 'SPS Rooftop',
      businessType: 'Partnership',
      principal: { name: 'Mehul Shah', designation: 'Managing Partner', mobile: '9811100002', email: 'provider.pending@solarmitra.demo' },
      yearEstablished: 2016,
      city: 'Rajkot',
      district: 'Rajkot',
      state: 'Gujarat',
      pin: '360001',
      gstin: makeGstin('24', panFirmGJ),
      pan: panFirmGJ,
      udyam: 'UDYAM-GJ-09-0001234',
      licenceTill: '2027-03-31',
      discomEmpanelled: true,
      discomName: 'Paschim Gujarat Vij Company Ltd (PGVCL)',
      yearsExperience: 9,
      installations: 140,
      capacityKw: 620,
      engineers: 3,
      electricians: 4,
      installers: 8,
      account: '998877665544',
      ifsc: 'HDFC0000128',
      bankName: 'HDFC Bank',
      branch: 'Rajkot Kalawad Road',
      phone: '9811100002',
      email: 'provider.pending@solarmitra.demo',
      docs: writePack('pending', '2026-09-28T10:00:00.000Z', ['partnership_deed', 'udyam_certificate', 'discom_empanelment']),
      timeline: [
        { status: 'Draft', at: '2026-09-12T09:00:00.000Z', byName: 'Mehul Shah', role: 'provider', note: 'Account created' },
        { status: 'Submitted', at: '2026-09-28T10:15:00.000Z', byName: 'Mehul Shah', role: 'provider', note: 'Application submitted' },
      ],
    }),
    build({
      id: 'PRV-2026-1003',
      userId: 'U-PRV-REV',
      status: 'Under Review',
      submittedAt: t('2026-09-18T07:30:00.000Z'),
      createdAt: t('2026-09-02T11:00:00.000Z'),
      legalName: 'Kongu Solar Private Limited',
      tradeName: 'Kongu Solar',
      businessType: 'Private Limited',
      principal: { name: 'Lakshmi Iyer', designation: 'Director', mobile: '9811100004', email: 'provider.review@solarmitra.demo', },
      yearEstablished: 2014,
      city: 'Coimbatore',
      district: 'Coimbatore',
      state: 'Tamil Nadu',
      pin: '641001',
      gstin: makeGstin('33', panCoTN),
      pan: panCoTN,
      cin: 'U40108TN2014PTC012345',
      licenceTill: '2028-01-31',
      discomEmpanelled: true,
      discomName: 'TANGEDCO',
      yearsExperience: 11,
      installations: 210,
      capacityKw: 980,
      engineers: 5,
      electricians: 6,
      installers: 12,
      account: '445566778899',
      ifsc: 'ICIC0001234',
      bankName: 'ICICI Bank',
      branch: 'Coimbatore Main',
      phone: '9811100004',
      email: 'provider.review@solarmitra.demo',
      docs: writePack('review', '2026-09-18T07:00:00.000Z', ['incorporation', 'discom_empanelment'], 'verified'),
      assigned: { userId: 'U-AGENT-1', name: 'Priya Nair', at: '2026-09-19T08:00:00.000Z' },
      checklist: passChecklist({
        gstin_valid: 'pass',
        pan_matches_gstin: 'pass',
        business_reg_doc: 'pass',
        electrical_licence: 'pending',
      }),
      timeline: [
        { status: 'Draft', at: '2026-09-02T11:00:00.000Z', byName: 'Lakshmi Iyer', role: 'provider', note: 'Account created' },
        { status: 'Submitted', at: '2026-09-18T07:30:00.000Z', byName: 'Lakshmi Iyer', role: 'provider', note: 'Application submitted' },
        { status: 'Assigned', at: '2026-09-19T08:00:00.000Z', byUserId: 'U-ADMIN', byName: 'Demo Operator', role: 'admin', note: 'Assigned to Priya Nair' },
        { status: 'Under Review', at: '2026-09-19T08:00:00.000Z', byUserId: 'U-AGENT-1', byName: 'Priya Nair', role: 'agent', note: 'Review started' },
      ],
    }),
    build({
      id: 'PRV-2026-1004',
      userId: 'U-PRV-CHG',
      status: 'Changes Requested',
      submittedAt: t('2026-09-10T06:00:00.000Z'),
      createdAt: t('2026-08-28T10:00:00.000Z'),
      legalName: 'Marwar Sun LLP',
      tradeName: 'Marwar Sun',
      businessType: 'LLP',
      principal: { name: 'Vikram Singh', designation: 'Designated Partner', mobile: '9811100005', email: 'provider.changes@solarmitra.demo' },
      yearEstablished: 2018,
      city: 'Jaipur',
      district: 'Jaipur',
      state: 'Rajasthan',
      pin: '302001',
      gstin: makeGstin('08', panLlpRJ),
      pan: panLlpRJ,
      llpin: 'AAB-1234',
      licenceTill: '2027-08-31',
      discomEmpanelled: false,
      yearsExperience: 7,
      installations: 88,
      capacityKw: 310,
      engineers: 2,
      electricians: 3,
      installers: 6,
      account: '667788990011',
      ifsc: 'UTIB0000456',
      bankName: 'Axis Bank',
      branch: 'Jaipur MI Road',
      phone: '9811100005',
      email: 'provider.changes@solarmitra.demo',
      docs: writePack('changes', '2026-09-10T05:30:00.000Z', ['partnership_deed']),
      assigned: { userId: 'U-AGENT-1', name: 'Priya Nair', at: '2026-09-11T09:00:00.000Z' },
      changeRequest: {
        fields: ['credentials.electricalLicenceValidTill', 'bank.accountHolderName'],
        documents: ['electrical_licence', 'cancelled_cheque'],
        message: 'Please re-upload a clearer electrical licence and a cancelled cheque matching the LLP name.',
        at: '2026-09-22T11:00:00.000Z',
        byUserId: 'U-AGENT-1',
        byName: 'Priya Nair',
      },
      timeline: [
        { status: 'Draft', at: '2026-08-28T10:00:00.000Z', byName: 'Vikram Singh', role: 'provider', note: 'Account created' },
        { status: 'Submitted', at: '2026-09-10T06:00:00.000Z', byName: 'Vikram Singh', role: 'provider', note: 'Application submitted' },
        { status: 'Under Review', at: '2026-09-11T09:00:00.000Z', byName: 'Priya Nair', role: 'agent', note: 'Review started' },
        { status: 'Changes Requested', at: '2026-09-22T11:00:00.000Z', byUserId: 'U-AGENT-1', byName: 'Priya Nair', role: 'agent', note: 'Please re-upload a clearer electrical licence and a cancelled cheque matching the LLP name.' },
      ],
    }),
    build({
      id: 'PRV-2026-1005',
      userId: 'U-PRV-RES',
      status: 'Resubmitted',
      submittedAt: t('2026-09-08T08:00:00.000Z'),
      createdAt: t('2026-08-20T08:00:00.000Z'),
      legalName: 'Sahyadri Green Private Limited',
      tradeName: 'Sahyadri Green',
      businessType: 'Private Limited',
      principal: { name: 'Sneha Kulkarni', designation: 'Director', mobile: '9811100006', email: 'provider.resubmitted@solarmitra.demo' },
      yearEstablished: 2015,
      city: 'Pune',
      district: 'Pune',
      state: 'Maharashtra',
      pin: '411001',
      gstin: makeGstin('27', panCoMH),
      pan: panCoMH,
      cin: 'U40100MH2015PTC098765',
      licenceTill: '2027-11-30',
      discomEmpanelled: true,
      discomName: 'MSEDCL',
      yearsExperience: 10,
      installations: 160,
      capacityKw: 740,
      engineers: 4,
      electricians: 5,
      installers: 10,
      account: '112233445566',
      ifsc: 'HDFC0000001',
      bankName: 'HDFC Bank',
      branch: 'Fort, Mumbai',
      phone: '9811100006',
      email: 'provider.resubmitted@solarmitra.demo',
      docs: writePack('resub', '2026-09-26T12:00:00.000Z', ['incorporation', 'discom_empanelment']),
      assigned: { userId: 'U-ADMIN', name: 'Demo Operator', at: '2026-09-09T10:00:00.000Z' },
      timeline: [
        { status: 'Draft', at: '2026-08-20T08:00:00.000Z', byName: 'Sneha Kulkarni', role: 'provider', note: 'Account created' },
        { status: 'Submitted', at: '2026-09-08T08:00:00.000Z', byName: 'Sneha Kulkarni', role: 'provider', note: 'Application submitted' },
        { status: 'Under Review', at: '2026-09-09T10:00:00.000Z', byName: 'Demo Operator', role: 'admin', note: 'Review started' },
        { status: 'Changes Requested', at: '2026-09-16T10:00:00.000Z', byName: 'Demo Operator', role: 'admin', note: 'GST certificate image is cropped. Please upload a full-page scan.' },
        { status: 'Resubmitted', at: '2026-09-26T12:30:00.000Z', byName: 'Sneha Kulkarni', role: 'provider', note: 'Documents re-uploaded' },
      ],
    }),
    build({
      id: 'PRV-2026-1006',
      userId: 'U-PRV-APPR',
      status: 'Approved',
      submittedAt: t('2026-08-02T09:00:00.000Z'),
      decidedAt: t('2026-08-18T14:00:00.000Z'),
      providerId: 'V-001',
      tier: 'Preferred',
      createdAt: t('2026-07-15T09:00:00.000Z'),
      legalName: 'Surya Shakti Solars',
      tradeName: 'Surya Shakti',
      businessType: 'Proprietorship',
      principal: { name: 'Rakesh Tiwari', designation: 'Proprietor', mobile: '9811100003', email: 'provider.approved@solarmitra.demo' },
      yearEstablished: 2017,
      city: 'Kanpur',
      district: 'Kanpur Nagar',
      state: 'Uttar Pradesh',
      pin: '208001',
      gstin: makeGstin('09', 'AARPA1111A'),
      pan: 'AARPA1111A',
      licenceTill: '2027-12-31',
      discomEmpanelled: true,
      discomName: 'Pashchimanchal Vidyut Vitran Nigam Ltd (PVVNL)',
      yearsExperience: 9,
      installations: 142,
      capacityKw: 510,
      engineers: 3,
      electricians: 4,
      installers: 8,
      account: '501234567890',
      ifsc: 'SBIN0000691',
      bankName: 'State Bank of India',
      branch: 'Kanpur Main',
      phone: '9811100003',
      email: 'provider.approved@solarmitra.demo',
      docs: writePack('approved', '2026-08-02T08:30:00.000Z', ['discom_empanelment'], 'verified'),
      assigned: { userId: 'U-ADMIN', name: 'Demo Operator', at: '2026-08-04T09:00:00.000Z' },
      checklist: passChecklist({
        gstin_valid: 'pass',
        pan_matches_gstin: 'pass',
        business_reg_doc: 'pass',
        electrical_licence: 'pass',
        discom_empanelment: 'pass',
        almm_dcr: 'pass',
        experience_plausible: 'pass',
        references_contacted: 'pass',
        bank_verified: 'pass',
        signatory_id: 'pass',
        no_blacklist_duplicates: 'pass',
        site_verification: 'pass',
      }),
      timeline: [
        { status: 'Draft', at: '2026-07-15T09:00:00.000Z', byName: 'Rakesh Tiwari', role: 'provider', note: 'Account created' },
        { status: 'Submitted', at: '2026-08-02T09:00:00.000Z', byName: 'Rakesh Tiwari', role: 'provider', note: 'Application submitted' },
        { status: 'Under Review', at: '2026-08-04T09:00:00.000Z', byName: 'Demo Operator', role: 'admin', note: 'Review started' },
        { status: 'Approved', at: '2026-08-18T14:00:00.000Z', byUserId: 'U-ADMIN', byName: 'Demo Operator', role: 'admin', note: 'Preferred partner — linked to vendor V-001' },
      ],
    }),
    build({
      id: 'PRV-2026-1007',
      userId: 'U-PRV-REJ',
      status: 'Rejected',
      submittedAt: t('2026-08-20T10:00:00.000Z'),
      decidedAt: t('2026-09-01T16:00:00.000Z'),
      createdAt: t('2026-08-10T10:00:00.000Z'),
      legalName: 'Magadh Solar Works',
      businessType: 'Proprietorship',
      principal: { name: 'Amit Kumar', designation: 'Proprietor', mobile: '9811100007', email: 'provider.rejected@solarmitra.demo' },
      yearEstablished: 2022,
      city: 'Patna',
      district: 'Patna',
      state: 'Bihar',
      pin: '800001',
      gstin: makeGstin('10', panPropBR),
      pan: panPropBR,
      licenceTill: '2027-01-31',
      discomEmpanelled: false,
      yearsExperience: 2,
      installations: 9,
      capacityKw: 22,
      engineers: 1,
      electricians: 1,
      installers: 2,
      account: '334455667788',
      ifsc: 'PUNB0012345',
      bankName: 'Punjab National Bank',
      branch: 'Patna Main',
      phone: '9811100007',
      email: 'provider.rejected@solarmitra.demo',
      notBlacklisted: false,
      blacklistingExplanation: 'Demo: previously flagged by a DISCOM empanelment drive (simulated).',
      docs: writePack('rejected', '2026-08-20T09:30:00.000Z'),
      rejectReason: { code: 'blacklisted', message: 'Applicant declared a prior DISCOM blacklisting. Not eligible in this demo cycle.' },
      checklist: passChecklist({ no_blacklist_duplicates: 'fail', gstin_valid: 'pass', pan_matches_gstin: 'pass' }),
      timeline: [
        { status: 'Draft', at: '2026-08-10T10:00:00.000Z', byName: 'Amit Kumar', role: 'provider', note: 'Account created' },
        { status: 'Submitted', at: '2026-08-20T10:00:00.000Z', byName: 'Amit Kumar', role: 'provider', note: 'Application submitted' },
        { status: 'Under Review', at: '2026-08-22T10:00:00.000Z', byName: 'Demo Operator', role: 'admin', note: 'Review started' },
        { status: 'Rejected', at: '2026-09-01T16:00:00.000Z', byUserId: 'U-ADMIN', byName: 'Demo Operator', role: 'admin', note: 'Applicant declared a prior DISCOM blacklisting. Not eligible in this demo cycle.' },
      ],
    }),
    build({
      id: 'PRV-2026-1008',
      userId: 'U-PRV-SUS',
      status: 'Suspended',
      submittedAt: t('2026-06-01T09:00:00.000Z'),
      decidedAt: t('2026-06-20T12:00:00.000Z'),
      providerId: 'V-201',
      tier: 'Standard',
      createdAt: t('2026-05-10T09:00:00.000Z'),
      legalName: 'Brahmaputra Solar',
      tradeName: 'Brahmaputra Solar',
      businessType: 'Proprietorship',
      principal: { name: 'Bikash Das', designation: 'Proprietor', mobile: '9811100008', email: 'provider.suspended@solarmitra.demo' },
      yearEstablished: 2019,
      city: 'Guwahati',
      district: 'Kamrup Metropolitan',
      state: 'Assam',
      pin: '781001',
      gstin: makeGstin('18', panPropAS),
      pan: panPropAS,
      licenceTill: '2027-04-30',
      discomEmpanelled: true,
      discomName: 'Assam Power Distribution Company Ltd (APDCL)',
      yearsExperience: 6,
      installations: 64,
      capacityKw: 210,
      engineers: 2,
      electricians: 2,
      installers: 5,
      account: '778899001122',
      ifsc: 'BARB0GUWAH1',
      bankName: 'Bank of Baroda',
      branch: 'Guwahati',
      phone: '9811100008',
      email: 'provider.suspended@solarmitra.demo',
      docs: writePack('suspended', '2026-06-01T08:30:00.000Z', ['discom_empanelment'], 'verified'),
      suspendReason: 'Demo: service-quality complaints — partner paused pending a field visit.',
      checklist: passChecklist({
        gstin_valid: 'pass',
        pan_matches_gstin: 'pass',
        business_reg_doc: 'pass',
        electrical_licence: 'pass',
        discom_empanelment: 'pass',
        almm_dcr: 'pass',
        experience_plausible: 'pass',
        references_contacted: 'pass',
        bank_verified: 'pass',
        signatory_id: 'pass',
        no_blacklist_duplicates: 'pass',
      }),
      timeline: [
        { status: 'Draft', at: '2026-05-10T09:00:00.000Z', byName: 'Bikash Das', role: 'provider', note: 'Account created' },
        { status: 'Submitted', at: '2026-06-01T09:00:00.000Z', byName: 'Bikash Das', role: 'provider', note: 'Application submitted' },
        { status: 'Approved', at: '2026-06-20T12:00:00.000Z', byName: 'Demo Operator', role: 'admin', note: 'Approved as Standard partner' },
        { status: 'Suspended', at: '2026-09-12T09:00:00.000Z', byUserId: 'U-ADMIN', byName: 'Demo Operator', role: 'admin', note: 'Demo: service-quality complaints — partner paused pending a field visit.' },
      ],
    }),
    build({
      id: 'PRV-2026-1009',
      userId: 'U-PRV-RISK',
      status: 'Submitted',
      submittedAt: t('2026-09-25T09:40:00.000Z'),
      createdAt: t('2026-09-21T09:00:00.000Z'),
      legalName: 'Ganga Plains Energy',
      businessType: 'Proprietorship',
      principal: { name: 'Neha Gupta', designation: 'Proprietor', mobile: '9811100009', email: 'provider.risk@solarmitra.demo' },
      yearEstablished: 2020,
      city: 'Varanasi',
      district: 'Varanasi',
      state: 'Uttar Pradesh',
      pin: '221001',
      // Registered in UP (09) but GSTIN uses Gujarat (24) — seeded risk flag.
      gstin: makeGstin('24', panPropUP2),
      pan: panPropUP2,
      licenceTill: '2027-09-30',
      discomEmpanelled: false,
      yearsExperience: 5,
      installations: 40,
      capacityKw: 120,
      engineers: 1,
      electricians: 2,
      installers: 3,
      account: '889900112233',
      ifsc: 'SBIN0000691',
      bankName: 'State Bank of India',
      branch: 'Kanpur Main',
      phone: '9811100009',
      email: 'provider.risk@solarmitra.demo',
      docs: writePack('risk', '2026-09-25T09:20:00.000Z'),
      timeline: [
        { status: 'Draft', at: '2026-09-21T09:00:00.000Z', byName: 'Neha Gupta', role: 'provider', note: 'Account created' },
        { status: 'Submitted', at: '2026-09-25T09:40:00.000Z', byName: 'Neha Gupta', role: 'provider', note: 'Application submitted' },
      ],
    }),
    build({
      id: 'PRV-2026-1010',
      userId: 'U-PRV-LIC',
      status: 'Under Review',
      submittedAt: t('2026-09-27T11:00:00.000Z'),
      createdAt: t('2026-09-22T11:00:00.000Z'),
      legalName: 'Kutch Sun Partnership',
      businessType: 'Partnership',
      principal: { name: 'Farhan Qureshi', designation: 'Partner', mobile: '9811100002', email: 'provider.licence@solarmitra.demo' },
      yearEstablished: 2019,
      city: 'Ahmedabad',
      district: 'Ahmedabad',
      state: 'Gujarat',
      pin: '380001',
      gstin: makeGstin('24', panFirmGJ2),
      pan: panFirmGJ2,
      licenceTill: '2026-10-20',
      discomEmpanelled: true,
      discomName: 'Uttar Gujarat Vij Company Ltd (UGVCL)',
      yearsExperience: 8,
      installations: 70,
      capacityKw: 240,
      engineers: 2,
      electricians: 2,
      installers: 5,
      account: '556677889900',
      ifsc: 'HDFC0000128',
      bankName: 'HDFC Bank',
      branch: 'Rajkot Kalawad Road',
      holder: 'Unrelated Holder Name',
      phone: '9811100002',
      email: 'provider.licence@solarmitra.demo',
      docs: writePack('licence', '2026-09-27T10:40:00.000Z', ['partnership_deed', 'discom_empanelment']),
      extraFlags: ['duplicate_phone'],
      assigned: { userId: 'U-AGENT-1', name: 'Priya Nair', at: '2026-09-28T08:00:00.000Z' },
      timeline: [
        { status: 'Draft', at: '2026-09-22T11:00:00.000Z', byName: 'Farhan Qureshi', role: 'provider', note: 'Account created' },
        { status: 'Submitted', at: '2026-09-27T11:00:00.000Z', byName: 'Farhan Qureshi', role: 'provider', note: 'Application submitted' },
        { status: 'Under Review', at: '2026-09-28T08:00:00.000Z', byName: 'Priya Nair', role: 'agent', note: 'Review started' },
      ],
    }),
  ];

  const vendors: Vendor[] = [
    {
      id: 'V-201',
      name: 'Brahmaputra Solar',
      location: 'Guwahati, Assam',
      state: 'Assam',
      district: 'Kamrup Metropolitan',
      rating: 4.2,
      distanceKm: 5,
      installations: 64,
      empanelled: true,
      verified: true,
      active: false,
      phone: '+91 98XXX 20101',
      yearsInBusiness: 7,
      specialities: ['Special-category state', 'Assamese support'],
      source: 'onboarded',
      tier: 'Standard',
      providerApplicationId: 'PRV-2026-1008',
      licenceExpiry: '2027-04-30',
      serviceStates: ['Assam'],
      suspendReason: 'Demo: service-quality complaints — partner paused pending a field visit.',
    },
  ];

  return { users: SEED_PROVIDER_USERS, applications, vendors };
}

export function toProviderUserRecords(hash: (password: string) => string): UserRecord[] {
  return SEED_PROVIDER_USERS.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email.toLowerCase(),
    passwordHash: hash(user.password),
    role: 'provider' as const,
    mobile: user.mobile,
    providerId: user.providerId,
  }));
}
