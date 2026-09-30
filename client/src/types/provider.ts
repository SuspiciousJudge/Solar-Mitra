import type {
  BusinessType,
  ChecklistKey,
  DocumentType,
  ProviderStatus,
  RiskFlagKey,
} from '@/utils/providerRules';

export type {
  BusinessType,
  ChecklistKey,
  DocumentType,
  ProviderStatus,
  RiskFlagKey,
} from '@/utils/providerRules';

export interface Address {
  line1?: string;
  line2?: string;
  city?: string;
  district?: string;
  state?: string;
  pin?: string;
}

export interface Principal {
  name?: string;
  designation?: string;
  mobile?: string;
  email?: string;
  din?: string;
}

export interface ProviderDocument {
  id: string;
  type: DocumentType;
  fileName: string;
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

export interface ProviderTimelineEvent {
  status: string;
  at: string;
  byUserId?: string;
  byName?: string;
  role?: string;
  note?: string;
}

export interface ProviderApplication {
  id: string;
  userId: string;
  status: ProviderStatus;
  businessDetails: {
    legalName?: string;
    tradeName?: string;
    businessType?: BusinessType;
    principals?: Principal[];
    yearEstablished?: number;
    yearsInBusiness?: number;
    registeredAddress?: Address;
    operationalAddress?: Address;
    sameAsRegistered?: boolean;
    website?: string;
    companyEmail?: string;
    officeLandline?: string;
  };
  statutory: {
    gstin?: string;
    pan?: string;
    udyam?: string;
    cin?: string;
    llpin?: string;
    tradeLicence?: string;
  };
  credentials: {
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
  };
  experience: {
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
    references?: Array<{ name?: string; city?: string; systemKw?: number; installationMonth?: string; phone?: string }>;
  };
  serviceArea: {
    states?: string[];
    districtsByState?: Record<string, string[]>;
    pinCodes?: string[];
    maxRadiusKm?: number;
    languages?: string[];
  };
  bank: {
    accountHolderName?: string;
    accountNumberLast4?: string;
    accountNumber?: string;
    ifsc?: string;
    accountType?: 'Current' | 'Savings';
    bankName?: string;
    branch?: string;
    ifscUnknown?: boolean;
  };
  contact: {
    signatoryName?: string;
    designation?: string;
    mobile?: string;
    email?: string;
    aadhaarLast4?: string;
  };
  declarations: {
    informationTrue?: boolean;
    agreeTerms?: boolean;
    agreeStandards?: boolean;
    consentVerification?: boolean;
    notBlacklisted?: boolean;
    blacklistingExplanation?: string;
    signatureName?: string;
    signedAt?: string;
    signedIp?: string;
  };
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
  tier?: 'Standard' | 'Preferred';
  changeRequest?: { fields: string[]; documents: string[]; message: string; at: string; byName: string };
  rejectReason?: { code: string; message: string };
  suspendReason?: string;
  createdAt: string;
  updatedAt: string;
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
  tier?: 'Standard' | 'Preferred';
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

export interface ProviderLead {
  id: string;
  customerFirstName: string;
  city: string;
  systemKW: number;
  status: string;
  installerUpdates: Array<{ kind: string; date: string; note?: string; confirmation: string; at: string }>;
}
