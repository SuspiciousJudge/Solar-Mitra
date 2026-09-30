import bcrypt from 'bcryptjs';
import type { TokenPayload } from './authService';
import { signToken, toPublicUser } from './authService';
import { getStore } from './dataStore';
import { completenessOf } from './providerCompleteness';
import { csvFilename, sendCsv, toCsv } from './csv';
import { deleteDocumentFile, writeDocumentFile } from './documentStore';
import { decryptSecret, encryptSecret } from '../utils/secretBox';
import { AppError, notFound } from '../utils/AppError';
import { generateDocumentId, generateProviderApplicationId, generateUserId } from '../utils/ids';
import type { PublicUser, Vendor } from '../types';
import type {
  BankDetails,
  BusinessDetails,
  ChecklistItemState,
  ProviderApplication,
  ProviderDocument,
  ProviderListItem,
  ProviderStats,
  ProviderTimelineEvent,
} from '../types/provider';
import {
  CHECKLIST_KEYS,
  DEMO_PROVIDER_OTP,
  MANDATORY_CHECKLIST_KEYS,
  canEditApplication,
  canTransitionProvider,
  collectSelfRiskFlags,
  lookupIfsc,
  maskAccount,
  maskGstin,
  maskPanDisplay,
  maskPhone,
  parsePinList,
  type ChecklistKey,
  type DocumentType,
  type ProviderStep,
  type ProviderStatus,
  type RiskFlagKey,
} from '../validators/providerRules';
import type { Response } from 'express';

function nowIso(): string {
  return new Date().toISOString();
}

function actorEvent(
  status: ProviderTimelineEvent['status'],
  actor: { userId: string; name: string; role: TokenPayload['role'] },
  note: string,
): ProviderTimelineEvent {
  return { status, at: nowIso(), byUserId: actor.userId, byName: actor.name, role: actor.role, note };
}

export function emptyProviderApplication(userId: string, id: string, actorName: string): ProviderApplication {
  const at = nowIso();
  return {
    id,
    userId,
    status: 'Draft',
    businessDetails: { principals: [{ name: '', designation: '', mobile: '', email: '' }], sameAsRegistered: true },
    statutory: {},
    credentials: { panelBrands: [], inverterBrands: [], certifications: [], discomNames: [] },
    experience: { typicalSizes: [1, 2, 3], references: [] },
    serviceArea: { states: [], districtsByState: {}, pinCodes: [], languages: ['Hindi', 'English'] },
    bank: {},
    contact: {},
    declarations: {},
    documents: [],
    completeness: 0,
    missing: [],
    riskFlags: [],
    checklist: Object.fromEntries(CHECKLIST_KEYS.map((key) => [key, { status: 'pending' }])) as Record<ChecklistKey, ChecklistItemState>,
    timeline: [{ status: 'Draft', at, byUserId: userId, byName: actorName, role: 'provider', note: 'Account created' }],
    createdAt: at,
    updatedAt: at,
  };
}

function refreshDerived(application: ProviderApplication, all: ProviderApplication[]): ProviderApplication {
  if (application.businessDetails.yearEstablished) {
    application.businessDetails.yearsInBusiness = new Date().getFullYear() - application.businessDetails.yearEstablished;
  }
  const computed = completenessOf(application);
  application.completeness = computed.score;
  application.missing = computed.missing;
  const selfFlags = collectSelfRiskFlags({
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
  const duplicates = duplicateFlags(application, all);
  application.riskFlags = Array.from(new Set([...selfFlags, ...duplicates]));
  return application;
}

function duplicateFlags(application: ProviderApplication, all: ProviderApplication[]): RiskFlagKey[] {
  const flags: RiskFlagKey[] = [];
  const gstin = application.statutory.gstin;
  const pan = application.statutory.pan;
  const phone = application.contact.mobile;
  const bankKey = application.bank.accountNumberLast4 && application.bank.ifsc ? `${application.bank.ifsc}:${application.bank.accountNumberLast4}` : undefined;
  for (const other of all) {
    if (other.id === application.id || other.status === 'Rejected') continue;
    if (gstin && other.statutory.gstin === gstin) flags.push('duplicate_gstin');
    if (pan && other.statutory.pan === pan) flags.push('duplicate_pan');
    if (phone && other.contact.mobile === phone) flags.push('duplicate_phone');
    const otherBank = other.bank.accountNumberLast4 && other.bank.ifsc ? `${other.bank.ifsc}:${other.bank.accountNumberLast4}` : undefined;
    if (bankKey && otherBank === bankKey) flags.push('duplicate_bank');
  }
  return Array.from(new Set(flags));
}

function assertTransition(from: ProviderStatus, to: ProviderStatus): void {
  const result = canTransitionProvider(from, to);
  if (!result.allowed) throw new AppError(409, result.reason ?? 'Invalid status change');
}

export function sanitizeProvider(
  application: ProviderApplication,
  options: { revealBank?: boolean; maskReferences?: boolean } = {},
): ProviderApplication {
  const copy = structuredClone(application);
  if (copy.statutory.pan) copy.statutory.pan = maskPanDisplay(copy.statutory.pan);
  if (copy.statutory.gstin && !options.revealBank) {
    /* GSTIN is shown in full on the operator detail view so reviewers can check it; list views use a dedicated DTO. */
  }
  delete copy.bank.accountNumberEncrypted;
  if (!options.revealBank) {
    copy.bank.accountNumberLast4 = copy.bank.accountNumberLast4 ? maskAccount(copy.bank.accountNumberLast4).slice(-10) : undefined;
  } else if (application.bank.accountNumberEncrypted) {
    try {
      (copy.bank as BankDetails & { accountNumber?: string }).accountNumber = decryptSecret(application.bank.accountNumberEncrypted);
    } catch {
      (copy.bank as BankDetails & { accountNumber?: string }).accountNumber = undefined;
    }
  }
  if (options.maskReferences && copy.experience.references) {
    copy.experience.references = copy.experience.references.map((reference) => ({ ...reference, phone: maskPhone(reference.phone) }));
  }
  return copy;
}

export function toListItem(application: ProviderApplication, now = new Date()): ProviderListItem {
  const waitingHours =
    application.submittedAt && !['Approved', 'Rejected', 'Draft'].includes(application.status)
      ? Math.max(0, (now.getTime() - new Date(application.submittedAt).getTime()) / 3_600_000)
      : undefined;
  return {
    id: application.id,
    userId: application.userId,
    status: application.status,
    legalName: application.businessDetails.legalName ?? 'Untitled',
    tradeName: application.businessDetails.tradeName,
    proprietor: application.businessDetails.principals?.[0]?.name ?? application.contact.signatoryName ?? '—',
    businessType: application.businessDetails.businessType,
    state: application.businessDetails.registeredAddress?.state,
    district: application.businessDetails.registeredAddress?.district,
    yearsInBusiness: application.businessDetails.yearsInBusiness,
    yearsExperience: application.experience.yearsExperience,
    totalInstallations: application.experience.totalInstallations,
    discomEmpanelled: Boolean(application.credentials.discomEmpanelled),
    completeness: application.completeness,
    riskFlagCount: application.riskFlags.length,
    riskFlags: application.riskFlags,
    submittedAt: application.submittedAt,
    waitingHours,
    assignedTo: application.assignedReviewer?.name,
    gstinMasked: maskGstin(application.statutory.gstin),
    panMasked: maskPanDisplay(application.statutory.pan),
    phoneMasked: maskPhone(application.contact.mobile),
    providerId: application.providerId,
    tier: application.tier,
  };
}

export async function registerProvider(input: {
  name: string;
  email: string;
  mobile: string;
  password: string;
  otp: string;
}): Promise<{ token: string; user: PublicUser }> {
  if (input.otp !== DEMO_PROVIDER_OTP) throw new AppError(400, 'Invalid OTP. In demo mode use 123456.');
  const store = getStore();
  const email = input.email.toLowerCase();
  if (await store.findUserByEmail(email)) throw new AppError(409, 'An account with this email already exists');
  const id = generateUserId();
  const user = {
    id,
    name: input.name,
    email,
    passwordHash: await bcrypt.hash(input.password, 10),
    role: 'provider' as const,
    mobile: input.mobile,
  };
  await store.createUser(user);
  const applicationId = generateProviderApplicationId(new Set((await store.listProviderApplications()).map((item) => item.id)));
  await store.saveProviderApplication(emptyProviderApplication(id, applicationId, input.name));
  const publicUser = toPublicUser(user);
  return { token: signToken(publicUser), user: publicUser };
}

export async function loginProvider(email: string, password: string): Promise<{ token: string; user: PublicUser }> {
  const user = await getStore().findUserByEmail(email);
  const valid = user ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!user || !valid) throw new AppError(401, 'Invalid email or password');
  if (user.role !== 'provider') throw new AppError(403, 'This account is not a SolarMitra partner account');
  const publicUser = toPublicUser(user);
  return { token: signToken(publicUser), user: publicUser };
}

export async function ownApplication(userId: string): Promise<ProviderApplication> {
  const store = getStore();
  const existing = await store.getProviderApplicationByUserId(userId);
  if (existing) return sanitizeProvider(existing, { maskReferences: false });
  const user = await store.findUserById(userId);
  const id = generateProviderApplicationId(new Set((await store.listProviderApplications()).map((item) => item.id)));
  const created = emptyProviderApplication(userId, id, user?.name ?? 'Provider');
  await store.saveProviderApplication(created);
  return sanitizeProvider(created);
}

async function loadOwn(userId: string): Promise<ProviderApplication> {
  const application = await getStore().getProviderApplicationByUserId(userId);
  if (!application) throw notFound('Application');
  return application;
}

export async function saveStep(userId: string, step: ProviderStep, body: Record<string, unknown>): Promise<ProviderApplication> {
  const application = await loadOwn(userId);
  if (!canEditApplication(application.status)) {
    throw new AppError(409, 'This application is locked. Wait for a change request before editing.');
  }
  if (step === 'business') {
    const details = body as BusinessDetails;
    if (details.yearEstablished) details.yearsInBusiness = new Date().getFullYear() - details.yearEstablished;
    if (details.sameAsRegistered) details.operationalAddress = details.registeredAddress;
    application.businessDetails = { ...application.businessDetails, ...details };
  } else if (step === 'statutory') {
    application.statutory = { ...application.statutory, ...body };
  } else if (step === 'credentials') {
    application.credentials = { ...application.credentials, ...body };
  } else if (step === 'experience') {
    application.experience = { ...application.experience, ...body };
  } else if (step === 'serviceArea') {
    const pinCsv = typeof body.pinCsv === 'string' ? body.pinCsv : '';
    const parsed = pinCsv ? parsePinList(pinCsv) : { pins: (body.pinCodes as string[] | undefined) ?? [], invalid: [] };
    if (parsed.invalid.length) throw new AppError(400, `Invalid PIN codes: ${parsed.invalid.slice(0, 5).join(', ')}`);
    application.serviceArea = {
      ...application.serviceArea,
      states: (body.states as string[] | undefined) ?? application.serviceArea.states,
      districtsByState: (body.districtsByState as Record<string, string[]> | undefined) ?? application.serviceArea.districtsByState,
      pinCodes: parsed.pins,
      maxRadiusKm: (body.maxRadiusKm as number | undefined) ?? application.serviceArea.maxRadiusKm,
      languages: (body.languages as string[] | undefined) ?? application.serviceArea.languages,
    };
  } else if (step === 'bank') {
    const accountNumber = typeof body.accountNumber === 'string' ? body.accountNumber : undefined;
    const ifsc = typeof body.ifsc === 'string' ? body.ifsc.toUpperCase() : application.bank.ifsc;
    const lookup = ifsc ? lookupIfsc(ifsc) : undefined;
    application.bank = {
      ...application.bank,
      accountHolderName: typeof body.accountHolderName === 'string' ? body.accountHolderName : application.bank.accountHolderName,
      ifsc,
      accountType: (body.accountType as BankDetails['accountType']) ?? application.bank.accountType,
      bankName: lookup?.bank,
      branch: lookup?.branch,
      ifscUnknown: Boolean(ifsc && !lookup),
    };
    if (accountNumber) {
      application.bank.accountNumberLast4 = accountNumber.slice(-4);
      application.bank.accountNumberEncrypted = encryptSecret(accountNumber);
    }
  } else if (step === 'contact') {
    application.contact = {
      signatoryName: body.signatoryName as string | undefined,
      designation: body.designation as string | undefined,
      mobile: body.mobile as string | undefined,
      email: body.email as string | undefined,
      aadhaarLast4: typeof body.aadhaarLast4 === 'string' && /^\d{4}$/.test(body.aadhaarLast4) ? body.aadhaarLast4 : undefined,
    };
    application.declarations = {
      ...application.declarations,
      informationTrue: body.informationTrue as boolean | undefined,
      agreeTerms: body.agreeTerms as boolean | undefined,
      agreeStandards: body.agreeStandards as boolean | undefined,
      consentVerification: body.consentVerification as boolean | undefined,
      notBlacklisted: body.notBlacklisted as boolean | undefined,
      blacklistingExplanation: body.blacklistingExplanation as string | undefined,
      signatureName: body.signatureName as string | undefined,
    };
  }
  application.updatedAt = nowIso();
  const all = await getStore().listProviderApplications();
  refreshDerived(application, all);
  await getStore().saveProviderApplication(application);
  return sanitizeProvider(application);
}

export async function submitApplication(userId: string, ip?: string): Promise<ProviderApplication> {
  const application = await loadOwn(userId);
  if (application.status !== 'Draft' && application.status !== 'Changes Requested') {
    throw new AppError(409, 'Only a draft or a change-requested application can be submitted');
  }
  const all = await getStore().listProviderApplications();
  refreshDerived(application, all);
  if (application.completeness < 100) {
    throw new AppError(400, `Please complete all mandatory items before submitting (${application.missing[0] ?? 'incomplete'})`);
  }
  const target: ProviderStatus = application.status === 'Changes Requested' ? 'Resubmitted' : 'Submitted';
  if (application.status === 'Draft') assertTransition('Draft', 'Submitted');
  else assertTransition('Changes Requested', 'Resubmitted');
  application.status = target;
  application.submittedAt = application.submittedAt ?? nowIso();
  application.updatedAt = nowIso();
  application.declarations.signedAt = nowIso();
  application.declarations.signedIp = ip;
  application.timeline.push({
    status: target,
    at: application.updatedAt,
    byUserId: userId,
    byName: application.contact.signatoryName ?? application.businessDetails.legalName,
    role: 'provider',
    note: target === 'Resubmitted' ? 'Application resubmitted after changes' : 'Application submitted',
  });
  refreshDerived(application, all);
  await getStore().saveProviderApplication(application);
  return sanitizeProvider(application);
}

export async function addDocument(
  userId: string,
  type: DocumentType,
  file: { buffer: Buffer; mimetype: string; originalname: string; size: number },
): Promise<ProviderApplication> {
  const application = await loadOwn(userId);
  if (!canEditApplication(application.status)) throw new AppError(409, 'Documents can only be changed while the application is editable');
  if (type === 'project_photo') {
    const photos = application.documents.filter((document) => document.type === 'project_photo');
    if (photos.length >= 5) throw new AppError(400, 'You can upload up to 5 project photos');
  } else {
    const existing = application.documents.find((document) => document.type === type);
    if (existing) {
      deleteDocumentFile(existing.storedName);
      application.documents = application.documents.filter((document) => document.id !== existing.id);
    }
  }
  const storedName = writeDocumentFile(file.buffer, file.mimetype);
  const document: ProviderDocument = {
    id: generateDocumentId(),
    type,
    fileName: file.originalname.replace(/[^\w.\- ()]/g, '_').slice(0, 160),
    storedName,
    mimeType: file.mimetype,
    sizeBytes: file.size,
    uploadedAt: nowIso(),
    verification: 'pending',
  };
  application.documents.push(document);
  application.updatedAt = nowIso();
  refreshDerived(application, await getStore().listProviderApplications());
  await getStore().saveProviderApplication(application);
  return sanitizeProvider(application);
}

export async function removeDocument(userId: string, docId: string): Promise<ProviderApplication> {
  const application = await loadOwn(userId);
  if (!canEditApplication(application.status)) throw new AppError(409, 'Documents can only be changed while the application is editable');
  const document = application.documents.find((item) => item.id === docId);
  if (!document) throw notFound('Document');
  deleteDocumentFile(document.storedName);
  application.documents = application.documents.filter((item) => item.id !== docId);
  application.updatedAt = nowIso();
  refreshDerived(application, await getStore().listProviderApplications());
  await getStore().saveProviderApplication(application);
  return sanitizeProvider(application);
}

export async function findDocumentForReader(
  docId: string,
  auth: TokenPayload,
): Promise<{ application: ProviderApplication; document: ProviderDocument }> {
  const all = await getStore().listProviderApplications();
  const application = all.find((item) => item.documents.some((document) => document.id === docId));
  if (!application) throw notFound('Document');
  const isOwner = auth.role === 'provider' && application.userId === auth.sub;
  const isOperator = auth.role === 'admin' || auth.role === 'agent' || auth.role === 'finance';
  if (!isOwner && !isOperator) throw new AppError(403, 'You do not have access to this document');
  const document = application.documents.find((item) => item.id === docId);
  if (!document) throw notFound('Document');
  return { application, document };
}

export interface ProviderListQuery {
  status?: string[];
  state?: string[];
  district?: string[];
  businessType?: string[];
  yearsMin?: number;
  yearsMax?: number;
  experienceMin?: number;
  experienceMax?: number;
  installationsMin?: number;
  installationsMax?: number;
  discomEmpanelled?: string;
  hasRiskFlags?: string;
  from?: string;
  to?: string;
  search?: string;
  sortBy: 'submittedAt' | 'completeness' | 'experience' | 'legalName';
  order: 'asc' | 'desc';
  page: number;
  limit: number;
}

export function filterProviderApplications(applications: ProviderApplication[], query: ProviderListQuery): ProviderApplication[] {
  const search = query.search?.trim().toLowerCase();
  return applications.filter((application) => {
    if (query.status?.length && !query.status.includes(application.status)) return false;
    const state = application.businessDetails.registeredAddress?.state;
    const district = application.businessDetails.registeredAddress?.district;
    if (query.state?.length && (!state || !query.state.includes(state))) return false;
    if (query.district?.length && (!district || !query.district.includes(district))) return false;
    if (query.businessType?.length && (!application.businessDetails.businessType || !query.businessType.includes(application.businessDetails.businessType))) {
      return false;
    }
    const years = application.businessDetails.yearsInBusiness ?? 0;
    if (query.yearsMin !== undefined && years < query.yearsMin) return false;
    if (query.yearsMax !== undefined && years > query.yearsMax) return false;
    const exp = application.experience.yearsExperience ?? 0;
    if (query.experienceMin !== undefined && exp < query.experienceMin) return false;
    if (query.experienceMax !== undefined && exp > query.experienceMax) return false;
    const installs = application.experience.totalInstallations ?? 0;
    if (query.installationsMin !== undefined && installs < query.installationsMin) return false;
    if (query.installationsMax !== undefined && installs > query.installationsMax) return false;
    if (query.discomEmpanelled === 'true' && !application.credentials.discomEmpanelled) return false;
    if (query.discomEmpanelled === 'false' && application.credentials.discomEmpanelled) return false;
    if (query.hasRiskFlags === 'true' && application.riskFlags.length === 0) return false;
    if (query.hasRiskFlags === 'false' && application.riskFlags.length > 0) return false;
    if (query.from && (application.submittedAt ?? '') < query.from) return false;
    if (query.to && (application.submittedAt ?? '') > `${query.to}T23:59:59.999Z`) return false;
    if (search) {
      const haystack = [
        application.id,
        application.businessDetails.legalName,
        application.businessDetails.tradeName,
        application.statutory.gstin,
        application.statutory.pan,
        application.contact.mobile,
        application.businessDetails.principals?.[0]?.name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
}

export async function listForOperator(query: ProviderListQuery) {
  const all = await getStore().listProviderApplications();
  all.forEach((application) => refreshDerived(application, all));
  const matched = filterProviderApplications(all, query);
  const direction = query.order === 'asc' ? 1 : -1;
  const sorted = [...matched].sort((a, b) => {
    if (query.sortBy === 'completeness') return (a.completeness - b.completeness) * direction;
    if (query.sortBy === 'experience') return ((a.experience.yearsExperience ?? 0) - (b.experience.yearsExperience ?? 0)) * direction;
    if (query.sortBy === 'legalName') return (a.businessDetails.legalName ?? '').localeCompare(b.businessDetails.legalName ?? '') * direction;
    return String(a.submittedAt ?? a.createdAt).localeCompare(String(b.submittedAt ?? b.createdAt)) * direction;
  });
  const pages = Math.max(1, Math.ceil(sorted.length / query.limit));
  const page = Math.min(Math.max(1, query.page), pages);
  const start = (page - 1) * query.limit;
  return {
    items: sorted.slice(start, start + query.limit).map((application) => toListItem(application)),
    total: sorted.length,
    page,
    pages,
    limit: query.limit,
  };
}

export function writeProviderCsv(res: Response, applications: ProviderApplication[]): void {
  const csv = toCsv(applications.map((application) => toListItem(application)), [
    { key: 'id', label: 'App No.', value: (row) => row.id },
    { key: 'legalName', label: 'Business name', value: (row) => row.legalName },
    { key: 'proprietor', label: 'Proprietor / Director', value: (row) => row.proprietor },
    { key: 'businessType', label: 'Business type', value: (row) => row.businessType },
    { key: 'state', label: 'State', value: (row) => row.state },
    { key: 'district', label: 'District', value: (row) => row.district },
    { key: 'yearsInBusiness', label: 'Years in business', value: (row) => row.yearsInBusiness },
    { key: 'yearsExperience', label: 'Solar experience', value: (row) => row.yearsExperience },
    { key: 'installations', label: 'Installations', value: (row) => row.totalInstallations },
    { key: 'discom', label: 'DISCOM empanelled', value: (row) => (row.discomEmpanelled ? 'Yes' : 'No') },
    { key: 'completeness', label: 'Completeness %', value: (row) => row.completeness },
    { key: 'risk', label: 'Risk flags', value: (row) => row.riskFlagCount },
    { key: 'status', label: 'Status', value: (row) => row.status },
    { key: 'submittedAt', label: 'Submitted', value: (row) => row.submittedAt },
    { key: 'assignedTo', label: 'Assigned to', value: (row) => row.assignedTo },
  ]);
  sendCsv(res, csvFilename('provider-applications'), csv);
}

export async function operatorGet(id: string, options: { revealBank?: boolean; actor?: TokenPayload } = {}): Promise<ProviderApplication> {
  const application = await getStore().getProviderApplication(id);
  if (!application) throw notFound('Application');
  if (options.revealBank) {
    if (!options.actor || (options.actor.role !== 'admin' && options.actor.role !== 'finance')) {
      throw new AppError(403, 'Only admin or finance can reveal bank details');
    }
    application.timeline.push(
      actorEvent('Reveal', { userId: options.actor.sub, name: options.actor.name, role: options.actor.role }, 'Bank account number revealed'),
    );
    application.updatedAt = nowIso();
    await getStore().saveProviderApplication(application);
  }
  const reviewed = application.status !== 'Draft' && application.status !== 'Submitted';
  return sanitizeProvider(application, { revealBank: options.revealBank, maskReferences: reviewed });
}

async function loadById(id: string): Promise<ProviderApplication> {
  const application = await getStore().getProviderApplication(id);
  if (!application) throw notFound('Application');
  return application;
}

function maybeStartReview(application: ProviderApplication, actor: TokenPayload): void {
  if (application.status === 'Submitted' || application.status === 'Resubmitted') {
    assertTransition(application.status, 'Under Review');
    application.status = 'Under Review';
    application.timeline.push(actorEvent('Under Review', { userId: actor.sub, name: actor.name, role: actor.role }, 'Review started'));
  }
}

export async function assignReviewer(id: string, actor: TokenPayload, reviewerId?: string, assignToMe?: boolean): Promise<ProviderApplication> {
  const application = await loadById(id);
  const targetId = assignToMe ? actor.sub : reviewerId;
  if (!targetId) throw new AppError(400, 'Provide a reviewerId or assignToMe');
  const reviewer = await getStore().findUserById(targetId);
  if (!reviewer || (reviewer.role !== 'admin' && reviewer.role !== 'agent' && reviewer.role !== 'finance')) {
    throw new AppError(400, 'Reviewer must be an operator');
  }
  maybeStartReview(application, actor);
  application.assignedReviewer = { userId: reviewer.id, name: reviewer.name, at: nowIso() };
  application.timeline.push(
    actorEvent('Assigned', { userId: actor.sub, name: actor.name, role: actor.role }, `Assigned to ${reviewer.name}`),
  );
  application.updatedAt = nowIso();
  await getStore().saveProviderApplication(application);
  return sanitizeProvider(application);
}

export async function patchChecklist(id: string, actor: TokenPayload, itemKey: ChecklistKey, status: ChecklistItemState['status'], note?: string) {
  const application = await loadById(id);
  maybeStartReview(application, actor);
  application.checklist[itemKey] = { status, by: actor.sub, byName: actor.name, at: nowIso(), note };
  application.timeline.push(
    actorEvent('Checklist', { userId: actor.sub, name: actor.name, role: actor.role }, `${itemKey}: ${status}${note ? ` — ${note}` : ''}`),
  );
  application.updatedAt = nowIso();
  await getStore().saveProviderApplication(application);
  return sanitizeProvider(application);
}

export async function verifyDocument(
  id: string,
  docId: string,
  actor: TokenPayload,
  verification: ProviderDocument['verification'],
  remark?: string,
) {
  const application = await loadById(id);
  maybeStartReview(application, actor);
  const document = application.documents.find((item) => item.id === docId);
  if (!document) throw notFound('Document');
  document.verification = verification;
  document.remark = remark;
  application.timeline.push(
    actorEvent('Document', { userId: actor.sub, name: actor.name, role: actor.role }, `${document.type}: ${verification}${remark ? ` — ${remark}` : ''}`),
  );
  application.updatedAt = nowIso();
  await getStore().saveProviderApplication(application);
  return sanitizeProvider(application);
}

export async function requestChanges(
  id: string,
  actor: TokenPayload,
  payload: { fields: string[]; documents: string[]; message: string },
) {
  const application = await loadById(id);
  maybeStartReview(application, actor);
  assertTransition(application.status, 'Changes Requested');
  application.status = 'Changes Requested';
  application.changeRequest = {
    fields: payload.fields,
    documents: payload.documents,
    message: payload.message,
    at: nowIso(),
    byUserId: actor.sub,
    byName: actor.name,
  };
  application.timeline.push(actorEvent('Changes Requested', { userId: actor.sub, name: actor.name, role: actor.role }, payload.message));
  application.updatedAt = nowIso();
  await getStore().saveProviderApplication(application);
  return sanitizeProvider(application);
}

export async function moveToSiteVerification(id: string, actor: TokenPayload, note?: string) {
  const application = await loadById(id);
  assertTransition(application.status, 'Site Verification');
  application.status = 'Site Verification';
  application.timeline.push(actorEvent('Site Verification', { userId: actor.sub, name: actor.name, role: actor.role }, note ?? 'Moved to site verification'));
  application.updatedAt = nowIso();
  await getStore().saveProviderApplication(application);
  return sanitizeProvider(application);
}

function nextVendorId(existing: Vendor[]): string {
  const nums = existing
    .map((vendor) => Number(vendor.id.replace(/^V-/, '')))
    .filter((value) => Number.isFinite(value));
  const next = Math.max(200, ...nums, 0) + 1;
  return `V-${String(next).padStart(3, '0')}`;
}

export async function approveApplication(id: string, actor: TokenPayload, note?: string, tier: 'Standard' | 'Preferred' = 'Standard') {
  if (actor.role !== 'admin') throw new AppError(403, 'Only an admin can approve a partner');
  const application = await loadById(id);
  const incomplete = MANDATORY_CHECKLIST_KEYS.filter((key) => application.checklist[key]?.status !== 'pass');
  if (incomplete.length) throw new AppError(409, 'Approve is blocked until every mandatory checklist item is marked pass');
  assertTransition(application.status, 'Approved');
  const store = getStore();
  const vendors = await store.listVendors();
  const existing = application.providerId ? vendors.find((vendor) => vendor.id === application.providerId) : undefined;
  const vendorId = existing?.id ?? nextVendorId(vendors);
  const state = application.businessDetails.registeredAddress?.state ?? 'Uttar Pradesh';
  const district = application.businessDetails.registeredAddress?.district;
  const city = application.businessDetails.registeredAddress?.city ?? district ?? state;
  const vendor: Vendor = {
    id: vendorId,
    name: application.businessDetails.tradeName || application.businessDetails.legalName || 'Solar partner',
    location: `${city}, ${state}`,
    state,
    district,
    rating: existing?.rating ?? 4.5,
    distanceKm: existing?.distanceKm ?? 4,
    installations: application.experience.totalInstallations ?? existing?.installations ?? 0,
    empanelled: Boolean(application.credentials.discomEmpanelled),
    verified: true,
    active: true,
    phone: application.contact.mobile ? `+91 ${application.contact.mobile}` : existing?.phone ?? '',
    yearsInBusiness: application.businessDetails.yearsInBusiness ?? 0,
    specialities: [
      ...(application.serviceArea.languages ?? []).slice(0, 2).map((language) => `${language} support`),
      ...(application.credentials.discomEmpanelled ? ['Net metering support'] : []),
      'On-grid rooftop',
    ].slice(0, 4),
    source: 'onboarded',
    tier,
    providerApplicationId: application.id,
    licenceExpiry: application.credentials.electricalLicenceValidTill,
    serviceStates: application.serviceArea.states?.length ? application.serviceArea.states : [state],
  };
  await store.upsertVendor(vendor);
  await store.updateUser(application.userId, { providerId: vendorId });
  application.status = 'Approved';
  application.providerId = vendorId;
  application.tier = tier;
  application.decidedAt = nowIso();
  application.updatedAt = application.decidedAt;
  application.timeline.push(actorEvent('Approved', { userId: actor.sub, name: actor.name, role: actor.role }, note ?? `Approved as ${tier} partner (${vendorId})`));
  await store.saveProviderApplication(application);
  return sanitizeProvider(application);
}

export async function rejectApplication(id: string, actor: TokenPayload, reasonCode: NonNullable<ProviderApplication['rejectReason']>['code'], message: string) {
  if (actor.role !== 'admin' && actor.role !== 'agent') throw new AppError(403, 'Your role cannot reject a partner application');
  const application = await loadById(id);
  assertTransition(application.status, 'Rejected');
  application.status = 'Rejected';
  application.rejectReason = { code: reasonCode, message };
  application.decidedAt = nowIso();
  application.updatedAt = application.decidedAt;
  application.timeline.push(actorEvent('Rejected', { userId: actor.sub, name: actor.name, role: actor.role }, message));
  await getStore().saveProviderApplication(application);
  return sanitizeProvider(application);
}

export async function suspendVendor(vendorId: string, actor: TokenPayload, reason: string) {
  if (actor.role !== 'admin') throw new AppError(403, 'Only an admin can suspend a partner');
  const store = getStore();
  const vendor = await store.getVendor(vendorId);
  if (!vendor) throw notFound('Vendor');
  const all = await store.listProviderApplications();
  const application = all.find((item) => item.providerId === vendorId);
  if (application) {
    assertTransition(application.status === 'Suspended' ? 'Suspended' : application.status, 'Suspended');
    application.status = 'Suspended';
    application.suspendReason = reason;
    application.updatedAt = nowIso();
    application.timeline.push(actorEvent('Suspended', { userId: actor.sub, name: actor.name, role: actor.role }, reason));
    await store.saveProviderApplication(application);
  }
  vendor.active = false;
  vendor.suspendReason = reason;
  await store.upsertVendor(vendor);
  return vendor;
}

export async function reinstateVendor(vendorId: string, actor: TokenPayload, reason: string) {
  if (actor.role !== 'admin') throw new AppError(403, 'Only an admin can reinstate a partner');
  const store = getStore();
  const vendor = await store.getVendor(vendorId);
  if (!vendor) throw notFound('Vendor');
  const all = await store.listProviderApplications();
  const application = all.find((item) => item.providerId === vendorId);
  if (application) {
    assertTransition(application.status, 'Approved');
    application.status = 'Approved';
    application.suspendReason = undefined;
    application.updatedAt = nowIso();
    application.timeline.push(actorEvent('Approved', { userId: actor.sub, name: actor.name, role: actor.role }, reason));
    await store.saveProviderApplication(application);
  }
  vendor.active = true;
  vendor.verified = true;
  vendor.suspendReason = undefined;
  await store.upsertVendor(vendor);
  return vendor;
}

export async function computeStats(now = new Date()): Promise<ProviderStats> {
  const all = await getStore().listProviderApplications();
  const statuses: ProviderStatus[] = [
    'Draft',
    'Submitted',
    'Under Review',
    'Changes Requested',
    'Resubmitted',
    'Site Verification',
    'Approved',
    'Rejected',
    'Suspended',
  ];
  const counts = Object.fromEntries(statuses.map((status) => [status, 0])) as Record<ProviderStatus, number>;
  all.forEach((application) => {
    counts[application.status] += 1;
  });
  const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const approvedThisMonth = all.filter((application) => application.status === 'Approved' && (application.decidedAt ?? '').startsWith(month)).length;
  const decided = all.filter((application) => application.decidedAt && application.submittedAt && (application.status === 'Approved' || application.status === 'Rejected'));
  const avgReviewHours =
    decided.length === 0
      ? null
      : decided.reduce((sum, application) => sum + (new Date(application.decidedAt!).getTime() - new Date(application.submittedAt!).getTime()) / 3_600_000, 0) /
        decided.length;
  const pendingStatuses: ProviderStatus[] = ['Submitted', 'Under Review', 'Resubmitted', 'Site Verification'];
  const pendingOver72h = all.filter((application) => {
    if (!pendingStatuses.includes(application.status) || !application.submittedAt) return false;
    return now.getTime() - new Date(application.submittedAt).getTime() > 72 * 3_600_000;
  }).length;
  return {
    byStatus: counts,
    submitted: counts.Submitted,
    underReview: counts['Under Review'],
    changesRequested: counts['Changes Requested'],
    approvedThisMonth,
    rejected: counts.Rejected,
    avgReviewHours: avgReviewHours === null ? null : Math.round(avgReviewHours * 10) / 10,
    pendingOver72h,
    pendingReview: counts.Submitted + counts['Under Review'] + counts.Resubmitted + counts['Site Verification'],
  };
}

export async function providerLeads(userId: string) {
  const user = await getStore().findUserById(userId);
  if (!user?.providerId) return [];
  const applications = await getStore().listApplications();
  return applications
    .filter((application) => application.vendorId === user.providerId)
    .slice(0, 50)
    .map((application) => ({
      id: application.id,
      customerFirstName: application.applicantName.split(' ')[0],
      city: application.location.split(',')[0],
      systemKW: application.systemKW,
      status: application.status,
      installerUpdates: application.installerUpdates ?? [],
    }));
}

export async function addLeadUpdate(
  userId: string,
  applicationId: string,
  update: { kind: 'site_visit_done' | 'installation_scheduled' | 'installed'; date: string; note?: string },
) {
  const user = await getStore().findUserById(userId);
  if (!user?.providerId) throw new AppError(403, 'Your account is not linked to an approved vendor yet');
  const application = await getStore().getApplication(applicationId);
  if (!application || application.vendorId !== user.providerId) throw notFound('Lead');
  const entry = { ...update, at: nowIso(), byUserId: userId, confirmation: 'pending' as const };
  const installerUpdates = [...(application.installerUpdates ?? []), entry];
  const saved = await getStore().patchApplication(applicationId, { installerUpdates });
  return saved;
}

export async function providerPayouts(userId: string) {
  const user = await getStore().findUserById(userId);
  if (!user?.providerId) return [];
  const transactions = await getStore().listTransactions();
  return transactions.filter((transaction) => transaction.vendorId === user.providerId && transaction.kind === 'Vendor Payout').slice(0, 50);
}

export async function providerNotifications(userId: string) {
  const application = await getStore().getProviderApplicationByUserId(userId);
  if (!application) return [];
  const items: { id: string; title: string; body: string; at: string; tone: 'info' | 'warn' }[] = [];
  application.timeline
    .slice(-8)
    .reverse()
    .forEach((event) => {
      items.push({ id: `${application.id}-${event.at}`, title: String(event.status), body: event.note ?? '', at: event.at, tone: event.status === 'Changes Requested' ? 'warn' : 'info' });
    });
  const till = application.credentials.electricalLicenceValidTill;
  if (till) {
    const days = Math.round((new Date(`${till}T00:00:00.000Z`).getTime() - Date.now()) / 86_400_000);
    if (days <= 30) {
      items.unshift({
        id: 'licence-expiry',
        title: days < 0 ? 'Electrical licence expired' : 'Electrical licence expiring',
        body: days < 0 ? `Expired ${Math.abs(days)} days ago` : `Expires in ${days} days`,
        at: nowIso(),
        tone: 'warn',
      });
    }
  }
  return items.slice(0, 12);
}
