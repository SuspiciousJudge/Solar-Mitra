export const APPLICATION_STATUSES = [
  'Pending Verification',
  'Approved',
  'Rejected',
  'Installation Scheduled',
  'Completed',
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export type UserRole = 'admin' | 'agent' | 'consumer';

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
}

export type PublicUser = Omit<UserRecord, 'passwordHash'>;

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

export interface SolarAudit {
  id: string;
  userId?: string;
  state: string;
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

export interface TimelineEvent {
  status: ApplicationStatus | 'Submitted';
  note: string;
  at: string;
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
  selectedKW?: number;
  preferredDate?: string;
  preferredTime?: string;
  installerNote?: string;
  consentGiven?: boolean;
  journey?: ApplicationJourneyDetails;
  vendorName?: string;
  status: ApplicationStatus;
  timeline: TimelineEvent[];
  isSeed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VendorFilter {
  state?: string;
  active?: boolean;
  search?: string;
}

export type NewApplicationInput = Omit<
  Application,
  'id' | 'status' | 'timeline' | 'isSeed' | 'createdAt' | 'updatedAt' | 'vendorName'
>;

export type NewAuditInput = Omit<SolarAudit, 'id' | 'createdAt'>;
