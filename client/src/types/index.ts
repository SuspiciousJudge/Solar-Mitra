import type { SolarRecommendation } from '@/utils/solarCalculator';

export type Language = 'en' | 'hi' | 'gu' | 'ta';

export const APPLICATION_STATUSES = [
  'Pending Verification',
  'Approved',
  'Rejected',
  'Installation Scheduled',
  'Completed',
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

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

export interface TimelineEvent {
  status: ApplicationStatus | 'Submitted';
  note: string;
  at: string;
}

export interface Application {
  id: string;
  applicantName: string;
  phone: string;
  location: string;
  state: string;
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
  vendorId: string;
  vendorName?: string;
  status: ApplicationStatus;
  timeline: TimelineEvent[];
  isSeed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationDetail extends Application {
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
  location: string;
  state: string;
  monthlyUnits: number;
  monthlyBill: number;
  vendorId: string;
  auditId?: string;
  loanAmount: number;
  interestRate: number;
  tenureMonths: number;
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

export type LeadSortField = 'createdAt' | 'applicantName' | 'systemKW' | 'subsidy' | 'loanAmount' | 'status';

export interface LeadQuery {
  search?: string;
  state?: string;
  status?: ApplicationStatus;
  sortBy?: LeadSortField;
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface AnalyticsOverview {
  asOf: string;
  households: number;
  capacityKW: number;
  co2OffsetTonnes: number;
  loansDisbursedINR: number;
  annualCleanEnergyMWh: number;
  equivalentTrees: number;
  change: { households: number; capacityKW: number; co2OffsetTonnes: number; loansDisbursedINR: number };
  pipeline: { total: number; pending: number; approved: number; scheduled: number; completed: number; rejected: number };
  methodology: { label: string; gridEmissionFactorKgPerKWh: number; kgCO2PerTreePerYear: number; note: string };
}

export interface MonthlyPoint {
  month: string;
  installations: number;
  capacityKW: number;
  co2Tonnes: number;
  cumulativeCO2: number;
  loansLakh: number;
  cumulativeLoansLakh: number;
}

export interface RegionalPoint {
  state: string;
  households: number;
  capacityKW: number;
  loansLakh: number;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'agent' | 'consumer';
}
