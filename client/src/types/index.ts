import type { SolarRecommendation } from '@/utils/solarCalculator';
import type { ApplicationStatus, RejectionReason, UserRole } from '@/utils/statusFlow';

export type { ApplicationStatus, RejectionReason, UserRole } from '@/utils/statusFlow';
export {
  APPLICATION_STATUSES,
  MILESTONE_ORDER,
  REJECTION_REASONS,
  STATUS_FLOW,
  TRANSITION_LABELS,
  TRANSITION_ROLES,
  availableTransitions,
  canTransition,
  isLive,
  nextStatuses,
} from '@/utils/statusFlow';

export type Language = 'en' | 'hi' | 'gu' | 'ta';

export type PaymentMode = 'loan' | 'upfront';

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiFailure {
  success: false;
  message: string;
}

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
}

export interface BillData {
  state: string;
  monthlyUnits: number;
  monthlyBill: number;
  source: 'ocr-demo' | 'manual';
}

export interface FinancingChoice {
  mode: 'upfront' | 'emi';
  loanAmount: number;
  interestRate: number;
  tenureMonths: number;
  emi: number;
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

export interface RepaymentState {
  emisDue: number;
  paidOnTime: number;
  paidLate: number;
  paid30PlusDpd: number;
  outstandingPrincipal: number;
}

export interface AgeingView {
  waitingHours: number;
  waitingLabel: string;
  slaBreached: boolean;
  slaHours: number;
}

export interface DuplicateWarning {
  applicationId: string;
  applicantName: string;
  status: ApplicationStatus;
  matchedOn: 'phone' | 'consumer number';
  value: string;
  assignedTo?: string;
}

export interface Application {
  id: string;
  applicantName: string;
  phone: string;
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
  vendorName?: string;
  journey?: {
    electricity?: { consumerName?: string; consumerNumber?: string; discom?: string; meterNumber?: string; connectionType?: string; sanctionedLoad?: string; billingPeriod?: string };
    personal?: { alternateMobile?: string; email?: string; dateOfBirth?: string; preferredLanguage?: string };
    kyc?: { documentType?: string; documentStatus?: 'demo-collection-only' };
    property?: { ownership?: string; permission?: boolean; addressLine1?: string; addressLine2?: string; city?: string; district?: string; state?: string; pinCode?: string; roofType?: string; roofArea?: number; shaded?: string };
    solar?: { batteryPreference?: string; paymentPreference?: string };
    booking?: { preferredDate?: string; preferredTime?: string; note?: string; consentGiven?: boolean };
  };
  status: ApplicationStatus;
  timeline: TimelineEvent[];
  assignedTo?: Assignment;
  repayment?: RepaymentState;
  estimatedMonthlyGeneration: number;
  estimatedMonthlySavings: number;
  isSeed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationView extends Application {
  ageing: AgeingView;
  duplicates?: DuplicateWarning[];
}

export interface ApplicationDetail extends ApplicationView {
  vendor: Vendor | null;
}

export interface TrackedApplication {
  id: string;
  applicantFirstName: string;
  systemKW: number;
  vendorName?: string;
  status: ApplicationStatus;
  timeline: TimelineEvent[];
  createdAt: string;
  updatedAt: string;
}

/** What the consumer app remembers about a submitted application. */
export interface SubmittedApplication {
  id: string;
  status: ApplicationStatus;
  createdAt: string;
  offline?: boolean;
}

export interface NewApplicationPayload {
  applicantName: string;
  phone: string;
  consumerNumber?: string;
  location: string;
  state: string;
  district?: string;
  monthlyUnits: number;
  monthlyBill: number;
  vendorId: string;
  auditId?: string;
  loanAmount: number;
  interestRate: number;
  tenureMonths: number;
  selectedKW?: number;
  preferredDate?: string;
  preferredTime?: string;
  note?: string;
  consentGiven?: boolean;
  journey?: Application['journey'];
}

export interface AuditResult {
  audit: { id: string };
  recommendation: SolarRecommendation;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
  limit: number;
}

// ── Operator filters ────────────────────────────────────────────────────────

export type LeadSortField = 'createdAt' | 'applicantName' | 'systemKW' | 'subsidy' | 'loanAmount' | 'status' | 'updatedAt';

/**
 * The operator filter contract shared by every list/analytics screen. Field
 * names mirror the API query params (see `utils/operatorFilters.ts` for the
 * serialisation helpers).
 */
export interface OperatorFilterState {
  states: string[];
  districts: string[];
  discoms: string[];
  schemes: string[];
  statuses: ApplicationStatus[];
  vendors: string[];
  paymentMode?: PaymentMode;
  search?: string;
  preset?: string;
  from?: string;
  to?: string;
}

export interface LeadQuery extends Partial<OperatorFilterState> {
  sortBy?: LeadSortField;
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface TransactionQuery extends Partial<OperatorFilterState> {
  kind?: string[];
  sortBy?: 'at' | 'amountINR' | 'kind';
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// ── Analytics ───────────────────────────────────────────────────────────────

export interface AppliedFilters {
  states: string[];
  districts: string[];
  discoms: string[];
  schemes: string[];
  statuses: ApplicationStatus[];
  vendors: string[];
  paymentMode?: PaymentMode;
  assignedTo?: string;
  search?: string;
  from?: string;
  to?: string;
  preset?: string;
}

export interface PeriodRange {
  from: string;
  to: string;
  days: number;
  label: string;
  preset: string;
  previousFrom: string;
  previousTo: string;
  /** True when the user explicitly chose a date range. */
  explicit: boolean;
}

export interface MoneyTotal {
  count: number;
  amountINR: number;
}

export interface ClimateMetrics {
  systemsLive: number;
  installedKW: number;
  installedMW: number;
  estAnnualKWh: number;
  estAnnualMWh: number;
  co2AvoidedTonnes: number;
  equivalentTrees: number;
  /** Period activity added vs the previous period of equal length (% change). */
  change: { systemsLive: number; installedKW: number; co2AvoidedTonnes: number };
  methodology: {
    label: string;
    gridEmissionFactorKgPerKWh: number;
    kgCO2PerTreePerYear: number;
    unitPerKW: number;
    note: string;
  };
}

export interface RepaymentHealth {
  emisDue: number;
  paidOnTime: number;
  paidLate: number;
  paid30PlusDpd: number;
  onTimePercent: number;
  dpd30PlusPercent: number;
}

export interface FinanceMetrics {
  sanctioned: MoneyTotal;
  disbursed: MoneyTotal;
  avgTicketINR: number;
  financedSharePercent: number;
  outstandingPrincipalINR: number;
  repayment: RepaymentHealth;
  change: { sanctionedAmountINR: number; disbursedAmountINR: number; sanctionedCount: number; disbursedCount: number };
}

export interface SubsidyMetrics {
  claimed: MoneyTotal;
  credited: MoneyTotal;
  avgDaysInstallToCredit: number | null;
  householdSavings: { monthlyINR: number; cumulativeINR: number; avgMonthlyPerHouseholdINR: number };
  change: { claimedAmountINR: number; creditedAmountINR: number; creditedCount: number };
}

export interface FunnelStage {
  key: string;
  label: string;
  value: number;
  /** Conversion from the previous stage (%), null for the first stage. */
  conversionFromPrevious: number | null;
}

export interface OperationsMetrics {
  pendingQueue: number;
  oldestWaitingHours: number;
  oldestWaitingLabel: string;
  slaBreachedCount: number;
  approvalRatePercent: number;
  decided: { approved: number; rejected: number };
  medianTimeToDecisionHours: number | null;
  medianTimeToInstallHours: number | null;
  /**
   * Monotonic milestone funnel for the applications created in the period:
   * audits → applications → approved → installed → commissioned → subsidy credited.
   * Loan steps sit on a branch (upfront households skip them) — see `loanBranch`.
   */
  funnel: FunnelStage[];
  loanBranch: {
    financedApplications: number;
    disbursed: number;
    conversionFromFinanced: number | null;
  };
}

export interface MoneyFlowMetrics {
  inflowINR: number;
  outflowINR: number;
  netINR: number;
  byKind: { kind: string; count: number; amountINR: number; direction: TransactionDirection }[];
}

export interface PipelineSummary {
  total: number;
  pending: number;
  approved: number;
  scheduled: number;
  completed: number;
  rejected: number;
  live: number;
  byStatus: Record<ApplicationStatus, number>;
}

export interface AnalyticsOverview {
  asOf: string;
  asOfLabel: string;
  period: PeriodRange;
  filters: AppliedFilters;
  dataPoints: { applications: number; audits: number; transactions: number };
  climate: ClimateMetrics;
  finance: FinanceMetrics;
  subsidy: SubsidyMetrics;
  operations: OperationsMetrics;
  moneyFlow: MoneyFlowMetrics;
  pipeline: PipelineSummary;
}

export interface MonthlyPoint {
  key: string;
  month: string;
  installations: number;
  capacityKW: number;
  co2Tonnes: number;
  cumulativeCO2: number;
  loansLakh: number;
  cumulativeLoansLakh: number;
  subsidyLakh: number;
  applications: number;
}

export interface RegionalPoint {
  state: string;
  code: string;
  type: 'state' | 'ut';
  applications: number;
  systemsLive: number;
  capacityKW: number;
  co2Tonnes: number;
  loansINR: number;
  loansLakh: number;
  subsidyCreditedINR: number;
}

export interface TransactionSummary {
  totalCount: number;
  totalINR: number;
  inflowINR: number;
  outflowINR: number;
  byKind: { kind: string; count: number; amountINR: number; direction: TransactionDirection }[];
  byMonth: { key: string; label: string; inflowINR: number; outflowINR: number; count: number }[];
}

// ── Money flow ──────────────────────────────────────────────────────────────

export const TRANSACTION_KINDS = [
  'Loan Sanctioned',
  'Loan Disbursed',
  'EMI Repayment',
  'Subsidy Claimed',
  'Subsidy Credited',
  'Consumer Upfront Payment',
  'Vendor Payout',
] as const;

export type TransactionKind = (typeof TRANSACTION_KINDS)[number];
export type TransactionDirection = 'inflow' | 'outflow' | 'none';

export interface Transaction {
  id: string;
  applicationId: string;
  applicantName: string;
  kind: TransactionKind;
  direction: TransactionDirection;
  amountINR: number;
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

export interface TransactionPage extends Paginated<Transaction> {
  totals: { amountINR: number; inflowINR: number; outflowINR: number };
}

export interface TransactionSummary {
  totalCount: number;
  totalINR: number;
  inflowINR: number;
  outflowINR: number;
  byKind: { kind: string; count: number; amountINR: number; direction: TransactionDirection }[];
  byMonth: { key: string; label: string; inflowINR: number; outflowINR: number; count: number }[];
}

// ── Schemes ─────────────────────────────────────────────────────────────────

export type SchemeLevel = 'central' | 'state';
export type SchemeCategory = 'residential_rooftop' | 'group_housing' | 'agriculture_pump' | 'agriculture_grid' | 'commercial';
export type SchemeSupportType = 'consumer_subsidy' | 'project_support' | 'manufacturing_incentive' | 'policy_incentive' | 'regulatory_mechanism';

export interface SubsidyScheme {
  id: string;
  name: string;
  shortName: string;
  level: SchemeLevel;
  state?: string;
  category: SchemeCategory;
  eligibility: string[];
  calc:
    | { type: 'per_kw_slab'; slabs: { uptoKW: number; perKW: number }[]; capINR?: number }
    | { type: 'percent_of_cost'; percent: number; capINR?: number }
    | { type: 'flat'; amountINR: number };
  specialCategoryOverride?: SubsidyScheme['calc'];
  stackableWith: string[];
  disbursementRoute: string;
  officialUrl?: string;
  lastVerified: string;
  isDemoAssumption: boolean;
  supportType?: SchemeSupportType;
  displayAmount?: string;
  notes?: string;
  calcDescription?: string;
  specialCategoryCalcDescription?: string;
  disclaimer?: string;
}

export interface SchemeCatalogue {
  version: string;
  lastVerified: string;
  disclaimer: string;
  supportTypes: SchemeSupportType[];
  total: number;
  schemes: SubsidyScheme[];
}

// ── Operator accounts ───────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface OperatorUser extends AuthUser {
  roleLabel: string;
}
