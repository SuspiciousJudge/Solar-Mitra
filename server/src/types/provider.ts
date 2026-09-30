import type { UserRole } from '../config/statusFlow';
import type {
  AccountType,
  BusinessType,
  ChecklistKey,
  DocumentType,
  ProviderRejectionCode,
  ProviderStatus,
  RiskFlagKey,
} from '../validators/providerRules';

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  district: string;
  state: string;
  pin: string;
}

export interface Principal {
  name: string;
  designation: string;
  mobile: string;
  email: string;
  din?: string;
}

export interface BusinessDetails {
  legalName?: string;
  tradeName?: string;
  businessType?: BusinessType;
  principals?: Principal[];
  yearEstablished?: number;
  yearsInBusiness?: number;
  registeredAddress?: Partial<Address>;
  operationalAddress?: Partial<Address>;
  sameAsRegistered?: boolean;
  website?: string;
  companyEmail?: string;
  officeLandline?: string;
}

export interface StatutoryDetails {
  gstin?: string;
  pan?: string;
  udyam?: string;
  cin?: string;
  llpin?: string;
  tradeLicence?: string;
}

export interface CredentialsDetails {
  electricalLicenceNo?: string;
  electricalLicenceAuthority?: string;
  electricalLicenceValidTill?: string;
  discomEmpanelled?: boolean;
  discomNames?: string[];
  empanelmentNo?: string;
  empanelmentValidTill?: string;
  nationalPortalVendorId?: string;
  mnreRegistration?: string;
  panelBrands?: string[];
  panelBrandsOther?: string;
  almmListed?: boolean;
  dcrModules?: boolean;
  inverterBrands?: string[];
  certifications?: string[];
  insurancePolicyNo?: string;
  insuranceValidTill?: string;
  insuranceType?: string;
}

export interface CustomerReference {
  name: string;
  city: string;
  systemKw: number;
  installationMonth: string;
  phone: string;
}

export interface ExperienceDetails {
  yearsExperience?: number;
  totalInstallations?: number;
  totalCapacityKw?: number;
  segmentResidential?: number;
  segmentCommercial?: number;
  segmentAgricultural?: number;
  segmentGroupHousing?: number;
  largestProjectKw?: number;
  typicalSizes?: number[];
  engineers?: number;
  certifiedElectricians?: number;
  installers?: number;
  serviceStaff?: number;
  capacityPerMonth?: number;
  avgTurnaroundDays?: number;
  afterSalesHours?: number;
  workmanshipWarrantyYears?: number;
  equipmentWarranty?: string;
  amcOffered?: boolean;
  amcDetails?: string;
  pricePerKw?: { kw1?: number; kw2?: number; kw3?: number; kw5?: number };
  references?: CustomerReference[];
}

export interface ServiceAreaDetails {
  states?: string[];
  districtsByState?: Record<string, string[]>;
  pinCodes?: string[];
  maxRadiusKm?: number;
  languages?: string[];
}

export interface BankDetails {
  accountHolderName?: string;
  accountNumberLast4?: string;
  accountNumberEncrypted?: string;
  ifsc?: string;
  accountType?: AccountType;
  bankName?: string;
  branch?: string;
  ifscUnknown?: boolean;
}

export interface ContactDetails {
  signatoryName?: string;
  designation?: string;
  mobile?: string;
  email?: string;
  aadhaarLast4?: string;
}

export interface Declarations {
  informationTrue?: boolean;
  agreeTerms?: boolean;
  agreeStandards?: boolean;
  consentVerification?: boolean;
  notBlacklisted?: boolean;
  blacklistingExplanation?: string;
  signatureName?: string;
  signedAt?: string;
  signedIp?: string;
}

export interface ProviderDocument {
  id: string;
  type: DocumentType;
  fileName: string;
  storedName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  verification: 'pending' | 'verified' | 'rejected';
  remark?: string;
}

export interface ChecklistItemState {
  status: 'pending' | 'pass' | 'fail';
  by?: string;
  byName?: string;
  at?: string;
  note?: string;
}

export type ProviderTimelineKind =
  | ProviderStatus
  | 'Note'
  | 'Assigned'
  | 'Checklist'
  | 'Document'
  | 'Reveal'
  | 'Changes Requested'
  | 'Resubmitted'
  | 'Profile change';

export interface ProviderTimelineEvent {
  status: ProviderTimelineKind;
  at: string;
  byUserId?: string;
  byName?: string;
  role?: UserRole;
  note?: string;
}

export interface ChangeRequest {
  fields: string[];
  documents: string[];
  message: string;
  at: string;
  byUserId: string;
  byName: string;
}

export type ProviderTier = 'Standard' | 'Preferred';

export interface ProviderApplication {
  id: string;
  userId: string;
  status: ProviderStatus;
  businessDetails: BusinessDetails;
  statutory: StatutoryDetails;
  credentials: CredentialsDetails;
  experience: ExperienceDetails;
  serviceArea: ServiceAreaDetails;
  bank: BankDetails;
  contact: ContactDetails;
  declarations: Declarations;
  documents: ProviderDocument[];
  completeness: number;
  missing: string[];
  riskFlags: RiskFlagKey[];
  checklist: Record<ChecklistKey, ChecklistItemState>;
  assignedReviewer?: { userId: string; name: string; at: string };
  timeline: ProviderTimelineEvent[];
  submittedAt?: string;
  decidedAt?: string;
  providerId?: string;
  tier?: ProviderTier;
  changeRequest?: ChangeRequest;
  rejectReason?: { code: ProviderRejectionCode; message: string };
  suspendReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderUserExtras {
  mobile?: string;
  providerId?: string;
}

export interface InstallerUpdate {
  kind: 'site_visit_done' | 'installation_scheduled' | 'installed';
  date: string;
  note?: string;
  photoDocumentId?: string;
  at: string;
  byUserId: string;
  confirmation: 'pending' | 'confirmed';
}

export interface ProfileChangeRequest {
  id: string;
  fields: string[];
  payload: Record<string, unknown>;
  status: 'pending' | 'approved' | 'rejected';
  at: string;
  note?: string;
}

export interface ProviderListItem {
  id: string;
  userId: string;
  status: ProviderStatus;
  legalName: string;
  tradeName?: string;
  proprietor: string;
  businessType?: BusinessType;
  state?: string;
  district?: string;
  yearsInBusiness?: number;
  yearsExperience?: number;
  totalInstallations?: number;
  discomEmpanelled: boolean;
  completeness: number;
  riskFlagCount: number;
  riskFlags: RiskFlagKey[];
  submittedAt?: string;
  waitingHours?: number;
  assignedTo?: string;
  gstinMasked?: string;
  panMasked?: string;
  phoneMasked?: string;
  providerId?: string;
  tier?: ProviderTier;
}

export interface ProviderStats {
  byStatus: Record<ProviderStatus, number>;
  submitted: number;
  underReview: number;
  changesRequested: number;
  approvedThisMonth: number;
  rejected: number;
  avgReviewHours: number | null;
  pendingOver72h: number;
  pendingReview: number;
}
