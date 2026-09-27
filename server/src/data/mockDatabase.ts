import { DEMO_FINANCING } from '../config/policyConfig';
import { calculateLoanSummary, calculateSolarRecommendation } from '../services/solarCalculator';
import type { Application, ApplicationStatus, TimelineEvent, Vendor } from '../types';

export const mockVendors: Vendor[] = [
  {
    id: 'V-001',
    name: 'Surya Shakti Solars',
    location: 'Kanpur, Uttar Pradesh',
    state: 'Uttar Pradesh',
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

const STATUS_PATH: ApplicationStatus[] = ['Pending Verification', 'Approved', 'Installation Scheduled', 'Completed'];

const addHours = (iso: string, hours: number) => new Date(new Date(iso).getTime() + hours * 3_600_000).toISOString();

function buildTimeline(submitted: string, status: ApplicationStatus): TimelineEvent[] {
  const events: TimelineEvent[] = [
    { status: 'Submitted', note: 'Application submitted via SolarMitra', at: submitted },
    { status: 'Pending Verification', note: 'Documents queued for verification', at: addHours(submitted, 1) },
  ];
  if (status === 'Rejected') {
    events.push({ status: 'Rejected', note: 'Selected vendor is not empanelled in this area', at: addHours(submitted, 30) });
    return events;
  }
  const reached = STATUS_PATH.indexOf(status);
  const notes: Record<string, string> = {
    Approved: 'Loan approved by Satin Finserv credit team',
    'Installation Scheduled': 'Vendor confirmed installation slot',
    Completed: 'System installed and net meter activated',
  };
  STATUS_PATH.slice(1, reached + 1).forEach((step, index) => events.push({ status: step, note: notes[step], at: addHours(submitted, 24 * (index + 1) * 2) }));
  return events;
}

function buildApplication(seed: SeedLead): Application {
  const rec = calculateSolarRecommendation(seed.monthlyUnits, seed.state, seed.monthlyBill);
  const marketCost = seed.marketCostOverride ?? rec.marketCost;
  const netCost = Math.max(0, marketCost - rec.totalSubsidy);
  const loan = calculateLoanSummary(netCost, DEMO_FINANCING.annualInterestRate, DEMO_FINANCING.tenureMonths);
  const timeline = buildTimeline(seed.submitted, seed.status);
  return {
    id: seed.id,
    applicantName: seed.applicantName,
    phone: seed.phone,
    location: seed.location,
    state: seed.state,
    monthlyUnits: seed.monthlyUnits,
    monthlyBill: seed.monthlyBill,
    systemKW: rec.recommendedKW,
    marketCost,
    centralSubsidy: rec.centralSubsidy,
    stateSubsidy: rec.stateSubsidy,
    subsidy: rec.totalSubsidy,
    netCost,
    loanAmount: netCost,
    interestRate: DEMO_FINANCING.annualInterestRate,
    tenureMonths: DEMO_FINANCING.tenureMonths,
    emi: loan.emi,
    vendorId: seed.vendorId,
    status: seed.status,
    timeline,
    isSeed: true,
    createdAt: seed.submitted,
    updatedAt: timeline[timeline.length - 1].at,
  };
}

/** Fresh copies every call so resetting the demo never shares mutated references. */
export const createSeedVendors = (): Vendor[] => mockVendors.map((vendor) => ({ ...vendor, specialities: [...vendor.specialities] }));
export const createSeedApplications = (): Application[] => seedLeads.map(buildApplication);

/**
 * Programme-level baseline analytics (demo). New applications that reach an
 * approved state are added on top of this baseline by the analytics service.
 */
export const mockAnalyticsBaseline = {
  households: 1240,
  capacityKW: 3200,
  co2OffsetTonnes: 4500,
  loansDisbursedINR: 85_000_000,
  previousPeriod: { households: 1047, capacityKW: 2710, co2OffsetTonnes: 3820, loansDisbursedINR: 71_400_000 },
  asOf: 'September 2026',
};

export const mockMonthlyAnalytics = [
  { month: 'Jan', installations: 62, capacityKW: 158, co2Tonnes: 221, loansLakh: 42 },
  { month: 'Feb', installations: 78, capacityKW: 199, co2Tonnes: 279, loansLakh: 53 },
  { month: 'Mar', installations: 95, capacityKW: 243, co2Tonnes: 340, loansLakh: 65 },
  { month: 'Apr', installations: 118, capacityKW: 302, co2Tonnes: 423, loansLakh: 80 },
  { month: 'May', installations: 141, capacityKW: 362, co2Tonnes: 507, loansLakh: 96 },
  { month: 'Jun', installations: 152, capacityKW: 391, co2Tonnes: 548, loansLakh: 104 },
  { month: 'Jul', installations: 168, capacityKW: 434, co2Tonnes: 609, loansLakh: 115 },
  { month: 'Aug', installations: 199, capacityKW: 515, co2Tonnes: 721, loansLakh: 137 },
  { month: 'Sep', installations: 227, capacityKW: 596, co2Tonnes: 852, loansLakh: 158 },
];

export const mockRegionalAnalytics = [
  { state: 'Uttar Pradesh', households: 412, capacityKW: 1080, loansLakh: 286 },
  { state: 'Gujarat', households: 318, capacityKW: 845, loansLakh: 214 },
  { state: 'Tamil Nadu', households: 204, capacityKW: 522, loansLakh: 142 },
  { state: 'Rajasthan', households: 176, capacityKW: 458, loansLakh: 121 },
  { state: 'Maharashtra', households: 130, capacityKW: 295, loansLakh: 87 },
];
