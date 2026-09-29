/**
 * Analytics payload contracts. Every number is aggregated from records
 * (applications, milestone events, audits and transactions) — there is no
 * hand-written KPI baseline anywhere in the analytics service.
 *
 * Mirrored in `client/src/types/index.ts`.
 */
import type { ApplicationStatus, PaymentMode } from './index';

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
   * Loan steps sit on a branch (upfront households skip them), so they are
   * reported separately in `loanBranch` instead of breaking the funnel shape.
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
  byKind: { kind: string; count: number; amountINR: number; direction: 'inflow' | 'outflow' | 'none' }[];
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
  byKind: { kind: string; count: number; amountINR: number; direction: 'inflow' | 'outflow' | 'none' }[];
  byMonth: { key: string; label: string; inflowINR: number; outflowINR: number; count: number }[];
}
