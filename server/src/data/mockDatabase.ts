/**
 * DEMO SEED — vendors and the handwritten "story" leads.
 *
 * The bulk of the analytics history is generated deterministically by
 * `historicalSeed.ts`; the leads below are the fixed, human-readable examples
 * used in the demo script (UP · 350 kWh → 3 kW → ₹57,000 net → EMI ≈ ₹1,773).
 */
import { defaultSchemeIdsForState } from '../config/subsidySchemes';
import { calculateLoanSummary, calculateMonthlySavings, calculateSolarRecommendation } from '../services/solarCalculator';
import type { Application, ApplicationStatus, SolarAudit, TimelineEvent, Transaction, Vendor } from '../types';
import { buildTimeline, createGeneratedVendors, createHistoricalSeed, mulberry32, type SeedData } from './historicalSeed';
import { findRegion } from './indiaRegions';

export const mockVendors: Vendor[] = [
  {
    id: 'V-001',
    name: 'Surya Shakti Solars',
    location: 'Kanpur, Uttar Pradesh',
    state: 'Uttar Pradesh',
    district: 'Kanpur Nagar',
    rating: 4.8,
    distanceKm: 2.4,
    empanelled: true,
    verified: true,
    active: true,
    installations: 142,
    phone: '+91 98XXX 11001',
    yearsInBusiness: 9,
    specialities: ['On-grid rooftop', 'Net metering support', '5-year service'],
  },
  {
    id: 'V-002',
    name: 'GreenVillage Energy',
    location: 'Kanpur, Uttar Pradesh',
    state: 'Uttar Pradesh',
    district: 'Kanpur Nagar',
    rating: 4.6,
    distanceKm: 5.1,
    empanelled: true,
    verified: true,
    active: true,
    installations: 89,
    phone: '+91 98XXX 11002',
    yearsInBusiness: 6,
    specialities: ['Rural installations', 'Hindi support', 'Subsidy paperwork help'],
  },
  {
    id: 'V-003',
    name: 'SunRise Rural Energy',
    location: 'Kanpur, Uttar Pradesh',
    state: 'Uttar Pradesh',
    district: 'Kanpur Nagar',
    rating: 4.7,
    distanceKm: 7.3,
    empanelled: true,
    verified: true,
    active: true,
    installations: 117,
    phone: '+91 98XXX 11003',
    yearsInBusiness: 7,
    specialities: ['Tin & RCC roofs', 'Battery backup options'],
  },
  {
    id: 'V-004',
    name: 'Saurashtra Sun Systems',
    location: 'Rajkot, Gujarat',
    state: 'Gujarat',
    district: 'Rajkot',
    rating: 4.7,
    distanceKm: 3.2,
    empanelled: true,
    verified: true,
    active: true,
    installations: 203,
    phone: '+91 98XXX 22001',
    yearsInBusiness: 11,
    specialities: ['Gujarati support', 'Commercial & residential'],
  },
  {
    id: 'V-005',
    name: 'Kongu Green Power',
    location: 'Coimbatore, Tamil Nadu',
    state: 'Tamil Nadu',
    district: 'Coimbatore',
    rating: 4.5,
    distanceKm: 4.6,
    empanelled: true,
    verified: true,
    active: true,
    installations: 96,
    phone: '+91 98XXX 33001',
    yearsInBusiness: 5,
    specialities: ['Tamil support', 'Farm & home rooftops'],
  },
  {
    id: 'V-006',
    name: 'Marwar Solar Works',
    location: 'Jaipur, Rajasthan',
    state: 'Rajasthan',
    district: 'Jaipur',
    rating: 4.4,
    distanceKm: 6.0,
    empanelled: true,
    verified: true,
    active: true,
    installations: 128,
    phone: '+91 98XXX 44001',
    yearsInBusiness: 8,
    specialities: ['High-irradiance design', 'Dust-resistant mounting'],
  },
  {
    id: 'V-007',
    name: 'Sahyadri Solar Solutions',
    location: 'Pune, Maharashtra',
    state: 'Maharashtra',
    district: 'Pune',
    rating: 4.3,
    distanceKm: 8.4,
    empanelled: false,
    verified: false,
    active: false,
    installations: 41,
    phone: '+91 98XXX 55001',
    yearsInBusiness: 3,
    specialities: ['Housing societies'],
  },
  {
    id: 'V-008',
    name: 'Deccan SunPower',
    location: 'Pune, Maharashtra',
    state: 'Maharashtra',
    district: 'Pune',
    rating: 4.6,
    distanceKm: 3.9,
    empanelled: true,
    verified: true,
    active: true,
    installations: 154,
    phone: '+91 98XXX 55002',
    yearsInBusiness: 10,
    specialities: ['Marathi support', 'Independent homes', 'Net metering support'],
  },
];

interface SeedLead {
  id: string;
  applicantName: string;
  phone: string;
  location: string;
  state: string;
  monthlyUnits: number;
  monthlyBill: number;
  vendorId: string;
  status: ApplicationStatus;
  submitted: string;
  /** Optional vendor quote override (e.g. premium panels) */
  marketCostOverride?: number;
}

const seedLeads: SeedLead[] = [
  { id: 'SM-2026-1001', applicantName: 'Rahul Sharma', phone: '9876501001', location: 'Kanpur, UP', state: 'Uttar Pradesh', monthlyUnits: 350, monthlyBill: 2800, vendorId: 'V-001', status: 'Pending Verification', submitted: '2026-09-24T10:15:00.000Z' },
  { id: 'SM-2026-1002', applicantName: 'Anjali Desai', phone: '9876501002', location: 'Rajkot, GJ', state: 'Gujarat', monthlyUnits: 240, monthlyBill: 2100, vendorId: 'V-004', status: 'Approved', submitted: '2026-09-21T08:40:00.000Z', marketCostOverride: 125000 },
  { id: 'SM-2026-1003', applicantName: 'Karthik Subramanian', phone: '9876501003', location: 'Coimbatore, TN', state: 'Tamil Nadu', monthlyUnits: 360, monthlyBill: 2600, vendorId: 'V-005', status: 'Installation Scheduled', submitted: '2026-09-18T12:05:00.000Z' },
  { id: 'SM-2026-1004', applicantName: 'Meena Kumari', phone: '9876501004', location: 'Jaipur, RJ', state: 'Rajasthan', monthlyUnits: 230, monthlyBill: 1900, vendorId: 'V-006', status: 'Completed', submitted: '2026-09-02T09:30:00.000Z' },
  { id: 'SM-2026-1005', applicantName: 'Suresh Patil', phone: '9876501005', location: 'Nashik, MH', state: 'Maharashtra', monthlyUnits: 380, monthlyBill: 3400, vendorId: 'V-007', status: 'Rejected', submitted: '2026-09-15T15:20:00.000Z' },
  { id: 'SM-2026-1006', applicantName: 'Pooja Verma', phone: '9876501006', location: 'Lucknow, UP', state: 'Uttar Pradesh', monthlyUnits: 130, monthlyBill: 1050, vendorId: 'V-002', status: 'Pending Verification', submitted: '2026-09-25T11:45:00.000Z' },
  { id: 'SM-2026-1007', applicantName: 'Harish Patel', phone: '9876501007', location: 'Surat, GJ', state: 'Gujarat', monthlyUnits: 370, monthlyBill: 3100, vendorId: 'V-004', status: 'Completed', submitted: '2026-08-27T07:55:00.000Z' },
  { id: 'SM-2026-1008', applicantName: 'Lakshmi Narayanan', phone: '9876501008', location: 'Madurai, TN', state: 'Tamil Nadu', monthlyUnits: 250, monthlyBill: 1800, vendorId: 'V-005', status: 'Pending Verification', submitted: '2026-09-26T06:10:00.000Z' },
  { id: 'SM-2026-1009', applicantName: 'Ramesh Choudhary', phone: '9876501009', location: 'Jodhpur, RJ', state: 'Rajasthan', monthlyUnits: 480, monthlyBill: 3900, vendorId: 'V-006', status: 'Approved', submitted: '2026-09-20T14:25:00.000Z' },
  { id: 'SM-2026-1010', applicantName: 'Sunita Jadhav', phone: '9876501010', location: 'Pune, MH', state: 'Maharashtra', monthlyUnits: 220, monthlyBill: 1900, vendorId: 'V-008', status: 'Installation Scheduled', submitted: '2026-09-12T10:00:00.000Z' },
];

/** Districts for the handwritten leads, used by the dependent District filter. */
const LEAD_DISTRICTS: Record<string, string> = {
  'SM-2026-1001': 'Kanpur Nagar',
  'SM-2026-1002': 'Rajkot',
  'SM-2026-1003': 'Coimbatore',
  'SM-2026-1004': 'Jaipur',
  'SM-2026-1005': 'Nashik',
  'SM-2026-1006': 'Lucknow',
  'SM-2026-1007': 'Surat',
  'SM-2026-1008': 'Madurai',
  'SM-2026-1009': 'Jodhpur',
  'SM-2026-1010': 'Pune',
};

function buildLeadApplication(seed: SeedLead, index: number): Application {
  const rec = calculateSolarRecommendation(seed.monthlyUnits, seed.state, seed.monthlyBill);
  const marketCost = seed.marketCostOverride ?? rec.marketCost;
  const netCost = Math.max(0, marketCost - rec.totalSubsidy);
  const financed = index % 3 !== 0;
  const loanAmount = financed ? netCost : 0;
  const loan = calculateLoanSummary(loanAmount, 7.5, 36);
  const district = LEAD_DISTRICTS[seed.id];
  const region = findRegion(seed.state);
  const discom = region?.discoms[0] ?? 'State DISCOM';
  const { timeline, status } = buildTimeline({
    createdAt: seed.submitted,
    target: seed.status,
    paymentMode: financed ? 'loan' : 'upfront',
    applicantIndex: index,
    rng: mulberry32(9100 + index),
  });
  const estimatedMonthlyGeneration = rec.estimatedMonthlyGeneration;
  const application: Application = {
    id: seed.id,
    applicantName: seed.applicantName,
    phone: seed.phone,
    consumerNumber: `DISC/${region?.code ?? 'IN'}/${(500000 + index * 31).toString().slice(0, 6)}`,
    location: seed.location,
    state: seed.state,
    district,
    discom,
    monthlyUnits: seed.monthlyUnits,
    monthlyBill: seed.monthlyBill,
    systemKW: rec.recommendedKW,
    marketCost,
    centralSubsidy: rec.centralSubsidy,
    stateSubsidy: rec.stateSubsidy,
    subsidy: rec.totalSubsidy,
    netCost,
    loanAmount,
    interestRate: financed ? 7.5 : 0,
    tenureMonths: financed ? 36 : 0,
    emi: loan.emi,
    paymentMode: financed ? 'loan' : 'upfront',
    schemeIds: defaultSchemeIdsForState(seed.state),
    vendorId: seed.vendorId,
    status,
    timeline,
    assignedTo: index % 2 === 0 ? { userId: 'U-AGENT-1', name: 'Priya Nair', at: seed.submitted, byUserId: 'U-ADMIN', byName: 'Demo Operator' } : undefined,
    estimatedMonthlyGeneration,
    estimatedMonthlySavings: calculateMonthlySavings(seed.monthlyUnits, seed.monthlyBill, estimatedMonthlyGeneration),
    isSeed: true,
    createdAt: seed.submitted,
    updatedAt: timeline[timeline.length - 1].at,
  };
  return application;
}

/** Fresh copies every call so resetting the demo never shares mutated references. */
export const createSeedVendors = (): Vendor[] => [
  ...mockVendors.map((vendor) => ({ ...vendor, specialities: [...vendor.specialities] })),
  ...createGeneratedVendors(mockVendors),
];

/** The 10 handwritten demo leads, with generated audit trails. */
export const createDemoLeadApplications = (): Application[] => seedLeads.map(buildLeadApplication);

export interface FullSeed {
  vendors: Vendor[];
  applications: Application[];
  audits: SolarAudit[];
  transactions: Transaction[];
  leads: { id: string; applicantName: string; phone: string; state: string; status: ApplicationStatus }[];
}

/** Everything the demo store needs, generated once per store/reset. */
export function createFullSeed(): FullSeed {
  const vendors = createSeedVendors();
  const history: SeedData = createHistoricalSeed(vendors);
  const demoLeads = createDemoLeadApplications();
  const applications = [...demoLeads, ...history.applications];
  return {
    vendors,
    applications,
    audits: history.audits,
    transactions: history.transactions,
    leads: applications.map((application) => ({
      id: application.id,
      applicantName: application.applicantName,
      phone: application.phone,
      state: application.state,
      status: application.status,
    })),
  };
}

export type { TimelineEvent };
