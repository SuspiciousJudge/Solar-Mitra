import type { ApplicationStatus, RejectionReason, UserRole } from '../config/statusFlow';
import type { AgeingView } from '../utils/ageing';

export {
  APPLICATION_STATUSES,
  MILESTONE_ORDER,
  REJECTION_REASONS,
  STATUS_FLOW,
  TRANSITION_LABELS,
  TRANSITION_ROLES,
  availableTransitions,
  canTransition,
  hasReached,
  isLive,
  milestoneAt,
  nextStatuses,
} from '../config/statusFlow';
export type { ApplicationStatus, RejectionReason, UserRole } from '../config/statusFlow';

export type PaymentMode = 'loan' | 'upfront';

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  mobile?: string;
  providerId?: string;
}

export type PublicUser = Omit<UserRecord, 'passwordHash'>;

export interface Vendor {
  id: string;
  name: string;
  location: string;
  state: string;
  district?: string;
  rating: number;
  distanceKm: number;
  installations: number;
  empanelled: boolean;
  verified: boolean;
  active: boolean;
  phone: string;
  yearsInBusiness: number;
  specialities: string[];
  source?: 'seeded' | 'onboarded';
  tier?: 'Standard' | 'Preferred';
  providerApplicationId?: string;
  licenceExpiry?: string;
  serviceStates?: string[];
  suspendReason?: string;
}

export interface SolarAudit {
  id: string;
  userId?: string;
  state: string;
  district?: string;
  discom?: string;
  consumerName?: string;
  consumerNumber?: string;
  meterNumber?: string;
  billingPeriod?: string;
  sanctionedLoad?: string;
  monthlyUnits: number;
  monthlyBill: number;
  recommendedKW: number;
  marketCost: number;
  subsidy: number;
  centralSubsidy: number;
  stateSupport: number;
  netCost: number;
  estimatedMonthlyGeneration: number;
  estimatedMonthlySavings: number;
  createdAt: string;
}

/** Audit-trail entry: who changed what, when, and why. */
export interface TimelineEvent {
  status: ApplicationStatus | 'Submitted';
  note: string;
  at: string;
  byUserId?: string;
  byName?: string;
  role?: UserRole;
  reason?: RejectionReason;
}

export interface Assignment {
  userId: string;
  name: string;
  at: string;
  byUserId?: string;
  byName?: string;
}

/** Aggregated repayment state for a financed application (demo modelling). */
export interface RepaymentState {
  emisDue: number;
  paidOnTime: number;
  paidLate: number;
  paid30PlusDpd: number;
  outstandingPrincipal: number;
}

export type { AgeingView } from '../utils/ageing';

export interface DuplicateWarning {
  applicationId: string;
  applicantName: string;
  status: ApplicationStatus;
  matchedOn: 'phone' | 'consumer number';
  value: string;
  assignedTo?: string;
}

export interface ApplicationJourneyDetails {
  electricity?: { consumerName?: string; consumerNumber?: string; discom?: string; meterNumber?: string; connectionType?: string; sanctionedLoad?: string; billingPeriod?: string };
  personal?: { alternateMobile?: string; email?: string; dateOfBirth?: string; preferredLanguage?: string };
  kyc?: { documentType?: string; documentStatus?: 'demo-collection-only' };
  property?: { ownership?: string; permission?: boolean; addressLine1?: string; addressLine2?: string; city?: string; district?: string; state?: string; pinCode?: string; roofType?: string; roofArea?: number; shaded?: string };
  solar?: { batteryPreference?: string; paymentPreference?: string };
  booking?: { preferredDate?: string; preferredTime?: string; note?: string; consentGiven?: boolean };
}

export interface Application {
  id: string;
  applicantName: string;
  phone: string;
  /** DISCOM consumer number — used for duplicate detection. */
  consumerNumber?: string;
  location: string;
  state: string;
  district?: string;
  discom?: string;
  auditId?: string;
  monthlyUnits: number;
  monthlyBill: number;
  systemKW: number;
  marketCost: number;
  centralSubsidy: number;
  stateSubsidy: number;
  subsidy: number;
  netCost: number;
  loanAmount: number;
  interestRate: number;
  tenureMonths: number;
  emi: number;
  paymentMode: PaymentMode;
  schemeIds: string[];
  vendorId: string;
  selectedKW?: number;
  preferredDate?: string;
  preferredTime?: string;
  installerNote?: string;
  consentGiven?: boolean;
  journey?: ApplicationJourneyDetails;
  vendorName?: string;
  status: ApplicationStatus;
  timeline: TimelineEvent[];
  assignedTo?: Assignment;
  repayment?: RepaymentState;
  estimatedMonthlyGeneration: number;
  estimatedMonthlySavings: number;
  isSeed: boolean;
  createdAt: string;
  updatedAt: string;
  installerUpdates?: Array<{
    kind: 'site_visit_done' | 'installation_scheduled' | 'installed';
    date: string;
    note?: string;
    photoDocumentId?: string;
    at: string;
    byUserId: string;
    confirmation: 'pending' | 'confirmed';
  }>;
}

/** Application payload as returned by the API (adds derived fields). */
export interface ApplicationView extends Application {
  ageing: AgeingView;
  duplicates?: DuplicateWarning[];
}

export type TransactionKind =
  | 'Loan Sanctioned'
  | 'Loan Disbursed'
  | 'EMI Repayment'
  | 'Subsidy Claimed'
  | 'Subsidy Credited'
  | 'Consumer Upfront Payment'
  | 'Vendor Payout';

export type TransactionDirection = 'inflow' | 'outflow' | 'none';

export const TRANSACTION_DIRECTIONS: Record<TransactionKind, TransactionDirection> = {
  'Loan Sanctioned': 'none',
  'Loan Disbursed': 'outflow',
  'EMI Repayment': 'inflow',
  'Subsidy Claimed': 'inflow',
  'Subsidy Credited': 'inflow',
  'Consumer Upfront Payment': 'inflow',
  'Vendor Payout': 'outflow',
};

export const TRANSACTION_KINDS = Object.keys(TRANSACTION_DIRECTIONS) as TransactionKind[];

export interface Transaction {
  id: string;
  applicationId: string;
  applicantName: string;
  kind: TransactionKind;
  direction: TransactionDirection;
  amountINR: number;
  /** Days past due — only meaningful for EMI repayments (0 = on time). */
  dpd?: number;
  state: string;
  district?: string;
  discom?: string;
  schemeIds: string[];
  vendorId?: string;
  paymentMode: PaymentMode;
  reference?: string;
  note?: string;
  at: string;
  byUserId: string;
  byName: string;
  role: UserRole;
  isSeed: boolean;
}

export type NewTransactionInput = Omit<Transaction, 'id' | 'direction' | 'applicantName' | 'isSeed'> & {
  applicantName?: string;
};

export interface VendorFilter {
  state?: string;
  district?: string;
  discom?: string;
  active?: boolean;
  verified?: boolean;
  search?: string;
}

export type NewApplicationInput = Omit<
  Application,
  'id' | 'status' | 'timeline' | 'isSeed' | 'createdAt' | 'updatedAt' | 'vendorName' | 'paymentMode' | 'ageing'
> &
  Partial<Pick<Application, 'paymentMode'>>;

export type NewAuditInput = Omit<SolarAudit, 'id' | 'createdAt'>;

export interface StatusUpdateInput {
  id: string;
  status: ApplicationStatus;
  note?: string;
  reason?: RejectionReason;
  actor: { userId: string; name: string; role: UserRole };
}
