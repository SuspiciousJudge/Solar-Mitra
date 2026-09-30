/**
 * Provider onboarding — validation rules, status machine and completeness.
 *
 * Dependency-free so it can be mirrored byte-for-byte at
 * `client/src/utils/providerRules.ts`. A server test fails if the copies drift.
 * Both the API (zod) and the provider form import these helpers — there is
 * only one GSTIN/PAN/IFSC implementation.
 */

export const DEMO_PROVIDER_OTP = '123456';

export const BUSINESS_TYPES = [
  'Proprietorship',
  'Partnership',
  'LLP',
  'Private Limited',
  'Public Limited',
  'OPC',
] as const;
export type BusinessType = (typeof BUSINESS_TYPES)[number];

/** 4th character of a business PAN must match the constitution. */
export const PAN_FOURTH_BY_BUSINESS: Record<BusinessType, 'P' | 'F' | 'C'> = {
  Proprietorship: 'P',
  Partnership: 'F',
  LLP: 'F',
  'Private Limited': 'C',
  'Public Limited': 'C',
  OPC: 'C',
};

export const ACCOUNT_TYPES = ['Current', 'Savings'] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const PROVIDER_STATUSES = [
  'Draft',
  'Submitted',
  'Under Review',
  'Changes Requested',
  'Resubmitted',
  'Site Verification',
  'Approved',
  'Rejected',
  'Suspended',
] as const;
export type ProviderStatus = (typeof PROVIDER_STATUSES)[number];

/**
 * Server-enforced state machine. `Approved` after `Suspended` is reinstatement.
 * `Rejected` is terminal (a new application may be filed after 30 days).
 */
export const PROVIDER_STATUS_FLOW: Record<ProviderStatus, ProviderStatus[]> = {
  Draft: ['Submitted'],
  Submitted: ['Under Review'],
  'Under Review': ['Changes Requested', 'Site Verification', 'Approved', 'Rejected'],
  'Changes Requested': ['Resubmitted'],
  Resubmitted: ['Under Review'],
  'Site Verification': ['Approved', 'Rejected', 'Changes Requested'],
  Approved: ['Suspended'],
  Suspended: ['Approved'],
  Rejected: [],
};

export const PROVIDER_STEPS = [
  'business',
  'statutory',
  'credentials',
  'experience',
  'serviceArea',
  'bank',
  'contact',
] as const;
export type ProviderStep = (typeof PROVIDER_STEPS)[number];

export const PROVIDER_STEP_LABELS: Record<ProviderStep, string> = {
  business: 'Business details',
  statutory: 'Statutory & tax',
  credentials: 'Solar credentials',
  experience: 'Experience & capacity',
  serviceArea: 'Service area',
  bank: 'Bank details',
  contact: 'Contact & declarations',
};

export const DOCUMENT_TYPES = [
  'gst_certificate',
  'pan_card',
  'incorporation',
  'partnership_deed',
  'udyam_certificate',
  'electrical_licence',
  'discom_empanelment',
  'mnre_registration',
  'certification',
  'cancelled_cheque',
  'signatory_id',
  'project_photo',
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  gst_certificate: 'GST certificate',
  pan_card: 'PAN card',
  incorporation: 'Incorporation certificate',
  partnership_deed: 'Partnership deed',
  udyam_certificate: 'Udyam certificate',
  electrical_licence: 'Electrical contractor licence',
  discom_empanelment: 'DISCOM empanelment letter',
  mnre_registration: 'MNRE / SNA registration',
  certification: 'ISO / BIS certification',
  cancelled_cheque: 'Cancelled cheque / bank statement',
  signatory_id: 'Signatory photo ID',
  project_photo: 'Project photograph',
};

export const CHECKLIST_KEYS = [
  'gstin_valid',
  'pan_matches_gstin',
  'business_reg_doc',
  'electrical_licence',
  'discom_empanelment',
  'almm_dcr',
  'experience_plausible',
  'references_contacted',
  'bank_verified',
  'signatory_id',
  'no_blacklist_duplicates',
  'site_verification',
] as const;
export type ChecklistKey = (typeof CHECKLIST_KEYS)[number];

export const CHECKLIST_ITEMS: { key: ChecklistKey; label: string; mandatory: boolean }[] = [
  { key: 'gstin_valid', label: 'GSTIN valid & active', mandatory: true },
  { key: 'pan_matches_gstin', label: 'PAN matches GSTIN', mandatory: true },
  { key: 'business_reg_doc', label: 'Business registration document verified', mandatory: true },
  { key: 'electrical_licence', label: 'Electrical licence valid', mandatory: true },
  { key: 'discom_empanelment', label: 'DISCOM empanelment verified', mandatory: true },
  { key: 'almm_dcr', label: 'ALMM / DCR compliance confirmed', mandatory: true },
  { key: 'experience_plausible', label: 'Experience & installation count plausible', mandatory: true },
  { key: 'references_contacted', label: 'References contacted (min 2)', mandatory: true },
  { key: 'bank_verified', label: 'Bank account verified (penny-drop)', mandatory: true },
  { key: 'signatory_id', label: 'Signatory ID verified', mandatory: true },
  { key: 'no_blacklist_duplicates', label: 'No blacklisting / duplicates', mandatory: true },
  { key: 'site_verification', label: 'Site / office verification', mandatory: false },
];

export const MANDATORY_CHECKLIST_KEYS = CHECKLIST_ITEMS.filter((item) => item.mandatory).map((item) => item.key);

export const PROVIDER_REJECTION_CODES = [
  'incomplete_documents',
  'gstin_invalid',
  'licence_expired',
  'experience_unverified',
  'blacklisted',
  'duplicate',
  'site_unsuitable',
  'other',
] as const;
export type ProviderRejectionCode = (typeof PROVIDER_REJECTION_CODES)[number];

export const PROVIDER_REJECTION_LABELS: Record<ProviderRejectionCode, string> = {
  incomplete_documents: 'Incomplete or unverifiable documents',
  gstin_invalid: 'GSTIN / PAN could not be verified',
  licence_expired: 'Electrical licence expired or not valid',
  experience_unverified: 'Claimed experience could not be verified',
  blacklisted: 'Blacklisted by a DISCOM or government agency',
  duplicate: 'Duplicate of an existing application or vendor',
  site_unsuitable: 'Registered office / site not suitable',
  other: 'Other',
};

export const PANEL_BRANDS = ['Waaree', 'Tata Power Solar', 'Adani', 'Vikram Solar', 'Luminous', 'Goldi Solar', 'Premier Energies', 'Other'];
export const INVERTER_BRANDS = ['Growatt', 'Sungrow', 'SMA', 'Luminous', 'Microtek', 'Solis', 'GoodWe', 'Other'];
export const CERTIFICATIONS = ['ISO 9001', 'ISO 14001', 'ISO 45001', 'BIS', 'MNRE Channel Partner'];
export const STAFF_LANGUAGES = ['English', 'Hindi', 'Gujarati', 'Tamil', 'Marathi', 'Bengali', 'Telugu', 'Kannada', 'Punjabi', 'Other'];
export const TYPICAL_SYSTEM_SIZES = [1, 2, 3, 5, 10] as const;

export const ALLOWED_DOCUMENT_MIMES = ['application/pdf', 'image/jpeg', 'image/png'] as const;
export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;

export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
export const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
export const UDYAM_REGEX = /^UDYAM-[A-Z]{2}-[0-9]{2}-[0-9]{7}$/;
export const PIN_REGEX = /^[1-9][0-9]{5}$/;
export const MOBILE_REGEX = /^[6-9]\d{9}$/;
export const CIN_REGEX = /^[A-Z][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/;
export const LLPIN_REGEX = /^[A-Z]{3}-[0-9]{4}$/;
export const ACCOUNT_REGEX = /^[0-9]{9,18}$/;

/** GSTIN first-two-digit codes → India region names used in this app. */
export const GSTIN_STATE_CODES: Record<string, string> = {
  '01': 'Jammu and Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '26': 'Dadra and Nagar Haveli and Daman and Diu',
  '27': 'Maharashtra',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman and Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
  '38': 'Ladakh',
};

const STATE_TO_GSTIN: Record<string, string> = Object.fromEntries(
  Object.entries(GSTIN_STATE_CODES).map(([code, name]) => [name.toLowerCase(), code]),
);

export function gstinStateCodeForName(state: string | undefined): string | undefined {
  if (!state) return undefined;
  return STATE_TO_GSTIN[state.trim().toLowerCase()];
}

const GSTIN_CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Official GSTIN checksum over the first 14 characters. */
export function gstinChecksumChar(body14: string): string {
  let sum = 0;
  for (let i = 0; i < 14; i += 1) {
    const code = GSTIN_CHARSET.indexOf(body14[i] ?? '');
    const product = Math.max(0, code) * ((i % 2) + 1);
    sum += Math.floor(product / 36) + (product % 36);
  }
  return GSTIN_CHARSET[(36 - (sum % 36)) % 36];
}

export function isValidGstinChecksum(gstin: string): boolean {
  if (!GSTIN_REGEX.test(gstin)) return false;
  return gstinChecksumChar(gstin.slice(0, 14)) === gstin[14];
}

export function panFromGstin(gstin: string): string {
  return gstin.slice(2, 12);
}

export function gstinStateName(gstin: string): string | undefined {
  return GSTIN_STATE_CODES[gstin.slice(0, 2)];
}

/** Build a format-and-checksum-valid (but fake) GSTIN for demo seeds and tests. */
export function makeGstin(stateCode: string, pan: string, entity = '1'): string {
  const body = `${stateCode}${pan.toUpperCase()}${entity}Z`;
  return `${body}${gstinChecksumChar(body)}`;
}

export function isValidPan(pan: string): boolean {
  return PAN_REGEX.test(pan);
}

export function panFourthMatchesBusiness(pan: string, businessType: BusinessType | undefined): boolean {
  if (!PAN_REGEX.test(pan) || !businessType) return false;
  return pan[3] === PAN_FOURTH_BY_BUSINESS[businessType];
}

export function isValidIfsc(ifsc: string): boolean {
  return IFSC_REGEX.test(ifsc);
}

export function isValidUdyam(udyam: string): boolean {
  return UDYAM_REGEX.test(udyam);
}

export function isValidPin(pin: string): boolean {
  return PIN_REGEX.test(pin);
}

export function isValidMobile(mobile: string): boolean {
  return MOBILE_REGEX.test(mobile);
}

export function normalizeMobile(raw: string): string {
  return raw.replace(/[\s-]/g, '').replace(/^(\+91|91)(?=\d{10}$)/, '');
}

export function passwordIssues(password: string): string | undefined {
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Za-z]/.test(password)) return 'Password must include at least one letter';
  if (!/[0-9]/.test(password)) return 'Password must include at least one number';
  return undefined;
}

export function daysUntil(isoDate: string, from = new Date()): number {
  const target = new Date(`${isoDate}T00:00:00.000Z`).getTime();
  if (Number.isNaN(target)) return NaN;
  const start = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  return Math.round((target - start) / 86_400_000);
}

export function licenceExpiryFlag(validTill: string | undefined, from = new Date()): 'expired' | 'expiring' | undefined {
  if (!validTill) return undefined;
  const days = daysUntil(validTill, from);
  if (Number.isNaN(days)) return undefined;
  if (days < 0) return 'expired';
  if (days < 90) return 'expiring';
  return undefined;
}

export function normalizeBusinessName(name: string): string {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9 ]+/g, ' ')
    .replace(/\b(PVT|PRIVATE|LTD|LIMITED|LLP|OPC|AND|THE|CO|COMPANY|SOLAR|ENERGY|POWER|SYSTEMS|SOLUTIONS|ENTERPRISES|TRADING)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function namesLooselyMatch(a: string, b: string): boolean {
  const left = normalizeBusinessName(a);
  const right = normalizeBusinessName(b);
  if (!left || !right) return false;
  if (left === right) return true;
  if (left.includes(right) || right.includes(left)) return true;
  const tokensLeft = new Set(left.split(' ').filter((token) => token.length > 1));
  const tokensRight = right.split(' ').filter((token) => token.length > 1);
  if (tokensLeft.size === 0 || tokensRight.length === 0) return false;
  const overlap = tokensRight.filter((token) => tokensLeft.has(token)).length;
  return overlap >= Math.min(2, tokensRight.length, tokensLeft.size);
}

export function maskAccount(last4: string | undefined): string {
  if (!last4) return 'XXXXXXXX';
  return `XXXXXX${last4.slice(-4)}`;
}

export function maskPan(pan: string | undefined): string {
  if (!pan) return '';
  if (pan.length < 10) return 'XXXXX****X';
  return `${pan.slice(0, 3)}XXXXXXX${pan.slice(-1)}`.replace(/X{7}/, 'XXXX');
}

export function maskPanDisplay(pan: string | undefined): string {
  if (!pan || pan.length !== 10) return pan ? 'XXXXX****X' : '';
  return `XXXXX${pan.slice(5)}`;
}

export function maskGstin(gstin: string | undefined): string {
  if (!gstin || gstin.length !== 15) return gstin ? 'XX****XXXXXXX' : '';
  return `${gstin.slice(0, 2)}XXXX${gstin.slice(6, 10)}XXXX${gstin.slice(-1)}`;
}

export function maskPhone(phone: string | undefined): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '').slice(-10);
  if (digits.length !== 10) return 'XXXXXX****';
  return `XXXXXX${digits.slice(-4)}`;
}

export const DEMO_IFSC: Record<string, { bank: string; branch: string; city: string }> = {
  SBIN0000691: { bank: 'State Bank of India', branch: 'Kanpur Main', city: 'Kanpur' },
  SBIN0000123: { bank: 'State Bank of India', branch: 'Lucknow Main', city: 'Lucknow' },
  HDFC0000128: { bank: 'HDFC Bank', branch: 'Rajkot Kalawad Road', city: 'Rajkot' },
  HDFC0000001: { bank: 'HDFC Bank', branch: 'Fort, Mumbai', city: 'Mumbai' },
  ICIC0000001: { bank: 'ICICI Bank', branch: 'Nariman Point', city: 'Mumbai' },
  ICIC0001234: { bank: 'ICICI Bank', branch: 'Coimbatore Main', city: 'Coimbatore' },
  UTIB0000001: { bank: 'Axis Bank', branch: 'Connaught Place', city: 'Delhi' },
  UTIB0000456: { bank: 'Axis Bank', branch: 'Jaipur MI Road', city: 'Jaipur' },
  PUNB0012345: { bank: 'Punjab National Bank', branch: 'Patna Main', city: 'Patna' },
  BARB0GUWAH1: { bank: 'Bank of Baroda', branch: 'Guwahati', city: 'Guwahati' },
  CNRB0000123: { bank: 'Canara Bank', branch: 'Chennai Anna Nagar', city: 'Chennai' },
  IDIB000C001: { bank: 'Indian Bank', branch: 'Chennai Main', city: 'Chennai' },
};

export function lookupIfsc(ifsc: string): { bank: string; branch: string; city: string } | undefined {
  return DEMO_IFSC[ifsc.toUpperCase()];
}

export function emptyChecklist(): Record<ChecklistKey, { status: 'pending' | 'pass' | 'fail' }> {
  return Object.fromEntries(CHECKLIST_KEYS.map((key) => [key, { status: 'pending' as const }])) as Record<
    ChecklistKey,
    { status: 'pending' | 'pass' | 'fail' }
  >;
}

export function canEditApplication(status: ProviderStatus): boolean {
  return status === 'Draft' || status === 'Changes Requested';
}

export function canTransitionProvider(
  from: ProviderStatus,
  to: ProviderStatus,
): { allowed: boolean; reason?: string } {
  if (from === to) return { allowed: false, reason: `Application is already ${to}` };
  if (!PROVIDER_STATUS_FLOW[from].includes(to)) {
    return {
      allowed: false,
      reason: `Cannot move from "${from}" to "${to}". Allowed next: ${PROVIDER_STATUS_FLOW[from].join(', ') || 'none'}`,
    };
  }
  return { allowed: true };
}

export interface CompletenessInput {
  business: {
    legalName?: string;
    businessType?: string;
    principals?: Array<{ name?: string; designation?: string; mobile?: string; email?: string }>;
    yearEstablished?: number;
    registeredAddress?: { line1?: string; city?: string; district?: string; state?: string; pin?: string };
    companyEmail?: string;
  };
  statutory: { gstin?: string; pan?: string; cin?: string; llpin?: string; udyam?: string };
  credentials: {
    electricalLicenceNo?: string;
    electricalLicenceAuthority?: string;
    electricalLicenceValidTill?: string;
    discomEmpanelled?: boolean;
  };
  experience: {
    yearsExperience?: number;
    totalInstallations?: number;
    totalCapacityKw?: number;
    engineers?: number;
    certifiedElectricians?: number;
    installers?: number;
    capacityPerMonth?: number;
    workmanshipWarrantyYears?: number;
    references?: unknown[];
  };
  serviceArea: { states?: string[]; districtsByState?: Record<string, string[]> };
  bank: { accountHolderName?: string; accountNumberLast4?: string; ifsc?: string; accountType?: string };
  contact: { signatoryName?: string; designation?: string; mobile?: string; email?: string };
  declarations: {
    informationTrue?: boolean;
    agreeTerms?: boolean;
    agreeStandards?: boolean;
    consentVerification?: boolean;
    notBlacklisted?: boolean;
    blacklistingExplanation?: string;
    signatureName?: string;
  };
  documentTypes: string[];
}

function filled(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

export function requiredDocumentsFor(input: CompletenessInput): DocumentType[] {
  const docs: DocumentType[] = ['gst_certificate', 'pan_card', 'electrical_licence', 'cancelled_cheque', 'signatory_id'];
  const type = input.business.businessType;
  if (type === 'Private Limited' || type === 'Public Limited' || type === 'OPC') docs.push('incorporation');
  if (type === 'Partnership' || type === 'LLP') docs.push('partnership_deed');
  if (input.statutory.udyam) docs.push('udyam_certificate');
  if (input.credentials.discomEmpanelled) docs.push('discom_empanelment');
  return docs;
}

export function computeCompleteness(input: CompletenessInput): { score: number; missing: string[]; mandatoryDocs: DocumentType[] } {
  const missing: string[] = [];
  const addr = input.business.registeredAddress ?? {};
  const principals = (input.business.principals ?? []).filter(
    (p) => filled(p.name) && filled(p.designation) && filled(p.mobile) && filled(p.email),
  );
  const checks: [boolean, string][] = [
    [filled(input.business.legalName), 'Legal business name'],
    [filled(input.business.businessType), 'Business type'],
    [principals.length > 0, 'At least one proprietor / director'],
    [filled(input.business.yearEstablished), 'Year of establishment'],
    [filled(addr.line1) && filled(addr.city) && filled(addr.district) && filled(addr.state) && filled(addr.pin), 'Registered address'],
    [filled(input.business.companyEmail), 'Company email'],
    [filled(input.statutory.gstin), 'GSTIN'],
    [filled(input.statutory.pan), 'PAN'],
    [filled(input.credentials.electricalLicenceNo), 'Electrical contractor licence number'],
    [filled(input.credentials.electricalLicenceAuthority), 'Licence issuing authority'],
    [filled(input.credentials.electricalLicenceValidTill), 'Licence valid-till date'],
    [filled(input.experience.yearsExperience), 'Years of solar experience'],
    [filled(input.experience.totalInstallations), 'Total installations'],
    [filled(input.experience.totalCapacityKw), 'Total capacity installed'],
    [filled(input.experience.engineers), 'Engineer headcount'],
    [filled(input.experience.certifiedElectricians), 'Certified electrician headcount'],
    [filled(input.experience.installers), 'Installer headcount'],
    [filled(input.experience.capacityPerMonth), 'Monthly installation capacity'],
    [filled(input.experience.workmanshipWarrantyYears), 'Workmanship warranty'],
    [(input.experience.references?.length ?? 0) >= 2, 'At least 2 customer references'],
    [(input.serviceArea.states?.length ?? 0) > 0, 'States served'],
    [Object.values(input.serviceArea.districtsByState ?? {}).some((list) => list.length > 0), 'Districts served'],
    [filled(input.bank.accountHolderName), 'Account holder name'],
    [filled(input.bank.accountNumberLast4), 'Bank account number'],
    [filled(input.bank.ifsc), 'IFSC'],
    [filled(input.bank.accountType), 'Account type'],
    [filled(input.contact.signatoryName), 'Authorised signatory name'],
    [filled(input.contact.designation), 'Signatory designation'],
    [filled(input.contact.mobile), 'Signatory mobile'],
    [filled(input.contact.email), 'Signatory email'],
    [input.declarations.informationTrue === true, 'Truthfulness declaration'],
    [input.declarations.agreeTerms === true, 'Partner terms'],
    [input.declarations.agreeStandards === true, 'MNRE / DISCOM standards'],
    [input.declarations.consentVerification === true, 'Verification consent'],
    [input.declarations.notBlacklisted === true || (input.declarations.notBlacklisted === false && filled(input.declarations.blacklistingExplanation)), 'Blacklisting declaration'],
    [filled(input.declarations.signatureName), 'Digital signature'],
  ];

  const type = input.business.businessType;
  if (type === 'Private Limited' || type === 'Public Limited' || type === 'OPC') {
    checks.push([filled(input.statutory.cin), 'CIN']);
  }
  if (type === 'LLP') checks.push([filled(input.statutory.llpin), 'LLPIN']);

  checks.forEach(([ok, label]) => {
    if (!ok) missing.push(label);
  });

  const mandatoryDocs = requiredDocumentsFor(input);
  const uploaded = new Set(input.documentTypes);
  mandatoryDocs.forEach((typeKey) => {
    if (!uploaded.has(typeKey)) missing.push(`Document: ${DOCUMENT_TYPE_LABELS[typeKey]}`);
  });

  const total = checks.length + mandatoryDocs.length;
  const done = total - missing.length;
  const score = total === 0 ? 0 : Math.round((done / total) * 100);
  return { score, missing, mandatoryDocs };
}

export interface SelfRiskInput {
  gstin?: string;
  pan?: string;
  registeredState?: string;
  businessType?: BusinessType;
  legalName?: string;
  tradeName?: string;
  accountHolderName?: string;
  yearsInBusiness?: number;
  yearsExperience?: number;
  totalInstallations?: number;
  engineers?: number;
  installers?: number;
  licenceValidTill?: string;
  notBlacklisted?: boolean;
}

export const RISK_FLAG_LABELS = {
  gstin_state_mismatch: 'GSTIN state does not match registered address state',
  pan_gstin_mismatch: 'PAN does not match the PAN embedded in GSTIN',
  pan_constitution_mismatch: 'PAN 4th character does not match business type',
  licence_expired: 'Electrical licence has expired',
  licence_expiring: 'Electrical licence expires in under 90 days',
  experience_exceeds_age: 'Solar experience exceeds years in business by more than 2 years',
  bank_name_mismatch: 'Account holder name does not match legal / trade name',
  installations_implausible: 'Installations claimed look high versus team size and years',
  declared_blacklisting: 'Applicant declared a prior blacklisting',
  duplicate_gstin: 'Duplicate GSTIN with another application or vendor',
  duplicate_pan: 'Duplicate PAN with another application',
  duplicate_phone: 'Duplicate mobile with another application',
  duplicate_bank: 'Duplicate bank account with another application',
} as const;

export type RiskFlagKey = keyof typeof RISK_FLAG_LABELS;

export function collectSelfRiskFlags(input: SelfRiskInput, from = new Date()): RiskFlagKey[] {
  const flags: RiskFlagKey[] = [];
  const gstin = input.gstin?.toUpperCase();
  const pan = input.pan?.toUpperCase();
  if (gstin && GSTIN_REGEX.test(gstin)) {
    const gstState = gstinStateName(gstin);
    if (input.registeredState && gstState && gstState.toLowerCase() !== input.registeredState.toLowerCase()) {
      flags.push('gstin_state_mismatch');
    }
    if (pan && panFromGstin(gstin) !== pan) flags.push('pan_gstin_mismatch');
  }
  if (pan && input.businessType && !panFourthMatchesBusiness(pan, input.businessType)) {
    flags.push('pan_constitution_mismatch');
  }
  const licence = licenceExpiryFlag(input.licenceValidTill, from);
  if (licence === 'expired') flags.push('licence_expired');
  if (licence === 'expiring') flags.push('licence_expiring');
  if (
    typeof input.yearsExperience === 'number' &&
    typeof input.yearsInBusiness === 'number' &&
    input.yearsExperience > input.yearsInBusiness + 2
  ) {
    flags.push('experience_exceeds_age');
  }
  const holder = input.accountHolderName ?? '';
  const legal = input.legalName ?? '';
  const trade = input.tradeName ?? '';
  if (holder && legal && !namesLooselyMatch(holder, legal) && !(trade && namesLooselyMatch(holder, trade))) {
    flags.push('bank_name_mismatch');
  }
  const team = (input.engineers ?? 0) + (input.installers ?? 0);
  const years = Math.max(1, input.yearsExperience ?? 0);
  if ((input.totalInstallations ?? 0) > 0 && team > 0 && (input.totalInstallations ?? 0) > team * years * 30) {
    flags.push('installations_implausible');
  }
  if (input.notBlacklisted === false) flags.push('declared_blacklisting');
  return flags;
}

export function parsePinList(raw: string): { pins: string[]; invalid: string[] } {
  const tokens = raw
    .split(/[\s,;]+/)
    .map((token) => token.trim())
    .filter(Boolean);
  const pins: string[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();
  tokens.forEach((token) => {
    if (!PIN_REGEX.test(token)) invalid.push(token);
    else if (!seen.has(token)) {
      seen.add(token);
      pins.push(token);
    }
  });
  return { pins, invalid };
}
