/**
 * DETERMINISTIC HISTORICAL SEED — DEMO DATA.
 *
 * Every operator KPI in the dashboard is aggregated from these records, so the
 * numbers always tie back to actual applications, milestones and transactions
 * (there is no hand-written baseline anywhere in the analytics service).
 *
 * The generator is seeded (`mulberry32(20260101)`), so the same "history" is
 * produced on every run and on every machine. Window: Jan–Sep 2026.
 */
import { calculateLoanSummary, calculateMonthlySavings, calculateSolarRecommendation } from '../services/solarCalculator';
import type {
  Application,
  ApplicationStatus,
  PaymentMode,
  RepaymentState,
  RejectionReason,
  SolarAudit,
  TimelineEvent,
  Transaction,
  UserRole,
  Vendor,
} from '../types';
import { INDIA_REGIONS, type IndiaRegion } from './indiaRegions';
import { defaultSchemeIdsForState } from '../config/subsidySchemes';

export const DEMO_SEED = 20_260_101;
export const DEMO_WINDOW = { from: '2026-01-01T00:00:00.000Z', to: '2026-09-26T23:59:00.000Z' };
export const TARGET_APPLICATIONS = 1250;
export const TARGET_AUDITS = 1900;

/** Seeded operator accounts (plain-text passwords live in the README, demo only). */
export interface SeedUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export const SEED_USERS: SeedUser[] = [
  { id: 'U-ADMIN', name: 'Demo Operator', email: 'admin@solarmitra.demo', password: 'demo123', role: 'admin' },
  { id: 'U-AGENT-1', name: 'Priya Nair', email: 'agent@solarmitra.demo', password: 'agent123', role: 'agent' },
  { id: 'U-FIN-1', name: 'Ravi Menon', email: 'finance@solarmitra.demo', password: 'finance123', role: 'finance' },
];

const ADMIN_USER = SEED_USERS[0];
const AGENT_USER = SEED_USERS[1];
const FINANCE_USER = SEED_USERS[2];

/** Small, fast, deterministic PRNG. */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

const WINDOW_START = new Date(DEMO_WINDOW.from).getTime();
const WINDOW_END = new Date(DEMO_WINDOW.to).getTime();

/** Status mix of the whole book of business (weights sum to 100). */
const STATUS_MIX: { status: ApplicationStatus; weight: number }[] = [
  { status: 'Pending Verification', weight: 6 },
  { status: 'Approved', weight: 8 },
  { status: 'Rejected', weight: 7 },
  { status: 'Loan Sanctioned', weight: 4 },
  { status: 'Loan Disbursed', weight: 5 },
  { status: 'Installation Scheduled', weight: 8 },
  { status: 'Installed', weight: 6 },
  { status: 'Net Meter Commissioned', weight: 8 },
  { status: 'Subsidy Claimed', weight: 6 },
  { status: 'Subsidy Credited', weight: 22 },
  { status: 'Completed', weight: 20 },
];

/**
 * How far back an early-stage file can still be sitting in that state.
 * Keeps the pending queue and approval pipeline realistic (nobody leaves a
 * verification pending for eight months).
 */
const RECENT_STATUS_WINDOW: Partial<Record<ApplicationStatus, number>> = {
  'Pending Verification': 9,
  Approved: 40,
  'Loan Sanctioned': 55,
  'Loan Disbursed': 70,
};

/** Rough adoption weight per state/UT code (rest get the default weight). */
const STATE_WEIGHTS: Record<string, number> = {
  UP: 130, MH: 95, GJ: 85, RJ: 78, TN: 66, KA: 66, MP: 58, WB: 48, AP: 40, TS: 40,
  BR: 38, HR: 34, PB: 30, KL: 28, OD: 24, JH: 20, CG: 20, AS: 18, DL: 18, UK: 14,
  GA: 8, HP: 8, CH: 5, PY: 4, JK: 6, TR: 4, ML: 3, MN: 3, MZ: 2, NL: 2, AR: 2, SK: 2,
  DH: 2, AN: 1,
  // Deliberately left without any applications so the UI can show the
  // "no data for this filter" empty state on a real region.
  LA: 0, LD: 0,
};

const FIRST_NAMES = [
  'Rahul', 'Anjali', 'Karthik', 'Meena', 'Suresh', 'Pooja', 'Harish', 'Lakshmi', 'Ramesh', 'Sunita',
  'Arjun', 'Deepa', 'Vikram', 'Sneha', 'Ravi', 'Aditya', 'Neha', 'Manish', 'Kavita', 'Rajesh',
  'Priya', 'Amit', 'Suresh', 'Geeta', 'Naveen', 'Asha', 'Rohit', 'Shalini', 'Mohit', 'Divya',
  'Farhan', 'Zoya', 'Iqbal', 'Ritu', 'Sanjay', 'Megha', 'Ajay', 'Pallavi', 'Varun', 'Bhavna',
  'Ganesh', 'Lata', 'Sudhir', 'Rekha', 'Yogesh', 'Anita', 'Hemant', 'Jyoti', 'Kiran', 'Nisha',
];

const LAST_NAMES = [
  'Sharma', 'Desai', 'Subramanian', 'Kumari', 'Patil', 'Verma', 'Patel', 'Narayanan', 'Choudhary', 'Jadhav',
  'Reddy', 'Naik', 'Yadav', 'Singh', 'Kaur', 'Das', 'Bose', 'Iyer', 'Menon', 'Gupta',
  'Mehta', 'Joshi', 'Kulkarni', 'Rao', 'Pillai', 'Ghosh', 'Chauhan', 'Mishra', 'Tiwari', 'Bhat',
];

const VENDOR_SUFFIXES = ['Solar Works', 'Sun Systems', 'Green Energy', 'Solar Solutions', 'Roof Power', 'Clean Watts'];

const SPECIALITIES = [
  'On-grid rooftop',
  'Net metering support',
  'Rural installations',
  'Subsidy paperwork help',
  'Housing societies',
  'Tin & RCC roofs',
  'Battery backup options',
  'Commercial & residential',
];

interface TimelineContext {
  createdAt: string;
  target: ApplicationStatus;
  paymentMode: PaymentMode;
  applicantIndex: number;
  rng: () => number;
}

interface BuiltTimeline {
  timeline: TimelineEvent[];
  status: ApplicationStatus;
}

/** Hours between each pair of consecutive milestones (min/max, jittered). */
const GAP_HOURS: Record<Exclude<ApplicationStatus, 'Pending Verification' | 'Rejected'>, [number, number]> = {
  Approved: [4, 96],
  'Loan Sanctioned': [8, 120],
  'Loan Disbursed': [24, 192],
  'Installation Scheduled': [48, 264],
  Installed: [72, 360],
  'Net Meter Commissioned': [120, 528],
  'Subsidy Claimed': [72, 480],
  'Subsidy Credited': [360, 1800],
  Completed: [2, 96],
};

const MILESTONE_CHAIN: ApplicationStatus[] = [
  'Approved',
  'Loan Sanctioned',
  'Loan Disbursed',
  'Installation Scheduled',
  'Installed',
  'Net Meter Commissioned',
  'Subsidy Claimed',
  'Subsidy Credited',
  'Completed',
];

function pickActor(role: UserRole, index: number) {
  if (role === 'finance') return { userId: FINANCE_USER.id, byName: FINANCE_USER.name, role: 'finance' as UserRole };
  if (role === 'agent') return { userId: AGENT_USER.id, byName: AGENT_USER.name, role: 'agent' as UserRole };
  return index % 4 === 0
    ? { userId: AGENT_USER.id, byName: AGENT_USER.name, role: 'agent' as UserRole }
    : { userId: ADMIN_USER.id, byName: ADMIN_USER.name, role: 'admin' as UserRole };
}

/**
 * Builds a realistic audit trail for a target status, stopping at the current
 * data window so the newest files are naturally still in progress.
 */
export function buildTimeline(context: TimelineContext): BuiltTimeline {
  const { createdAt, target, paymentMode, applicantIndex, rng } = context;
  const start = new Date(createdAt).getTime();
  const timeline: TimelineEvent[] = [{ status: 'Submitted', note: 'Application submitted via SolarMitra', at: new Date(start).toISOString(), byName: 'Consumer app' }];
  let cursor = start + rng() * 4 * HOUR;
  timeline.push({
    status: 'Pending Verification',
    note: 'Documents queued for verification',
    at: new Date(cursor).toISOString(),
    ...pickActor('agent', applicantIndex),
  });
  let status: ApplicationStatus = 'Pending Verification';
  const stopAt = target === 'Pending Verification' ? -1 : MILESTONE_CHAIN.indexOf(target);

  if (target === 'Rejected') {
    // A rejected file stops at the decision, with a reason on the record.
    const reasons: RejectionReason[] = ['Incomplete documents', 'Roof not suitable', 'Credit not eligible', 'Duplicate', 'Other'];
    const reason = reasons[Math.floor(rng() * reasons.length)];
    const at = cursor + (4 + rng() * 92) * HOUR;
    if (at <= WINDOW_END) {
      timeline.push({
        status: 'Rejected',
        note: `${reason}${reason === 'Other' ? ' — flagged during operator review' : ''}`,
        reason,
        at: new Date(at).toISOString(),
        ...pickActor('agent', applicantIndex),
      });
      status = 'Rejected';
    }
    return { timeline, status };
  }

  for (let step = 0; step <= stopAt; step += 1) {
    const milestone = MILESTONE_CHAIN[step];
    if (paymentMode === 'upfront' && (milestone === 'Loan Sanctioned' || milestone === 'Loan Disbursed')) continue;
    const gap = GAP_HOURS[milestone as Exclude<ApplicationStatus, 'Pending Verification' | 'Rejected'>];
    cursor += (gap[0] + rng() * (gap[1] - gap[0])) * HOUR;
    if (cursor > WINDOW_END) break;
    const actorRole: UserRole =
      milestone === 'Loan Sanctioned' || milestone === 'Loan Disbursed' || milestone === 'Subsidy Credited' ? 'finance' : 'agent';
    const notes: Partial<Record<ApplicationStatus, string>> = {
      Approved: 'Documents verified — application approved',
      'Loan Sanctioned': 'Loan sanctioned by Satin Finserv credit team',
      'Loan Disbursed': 'Loan amount disbursed to the vendor',
      'Installation Scheduled': 'Vendor confirmed installation slot',
      Installed: 'Installation completed by the vendor',
      'Net Meter Commissioned': 'Net meter installed, tested and commissioned by the DISCOM',
      'Subsidy Claimed': 'Subsidy claim filed on the national portal',
      'Subsidy Credited': 'Subsidy credited to the consumer bank account',
      Completed: 'File closed — household onboarded to monitoring',
    };
    timeline.push({
      status: milestone,
      note: notes[milestone] ?? milestone,
      at: new Date(cursor).toISOString(),
      ...pickActor(actorRole, applicantIndex + step),
    });
    status = milestone;
  }

  return { timeline, status };
}

function weightedStatus(rng: () => number): ApplicationStatus {
  const total = STATUS_MIX.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = rng() * total;
  for (const entry of STATUS_MIX) {
    roll -= entry.weight;
    if (roll <= 0) return entry.status;
  }
  return 'Pending Verification';
}

function regionPool(): IndiaRegion[] {
  const pool: IndiaRegion[] = [];
  INDIA_REGIONS.forEach((region) => {
    const weight = STATE_WEIGHTS[region.code] ?? 0.8;
    for (let i = 0; i < Math.round(weight * 10); i += 1) pool.push(region);
  });
  return pool;
}

function makeConsumerNumber(region: IndiaRegion, discom: string, index: number): string {
  const discomCode = discom.replace(/[^A-Za-z]/g, '').slice(0, 4).toUpperCase() || 'DIS';
  return `${discomCode}/${region.code}/${(100000 + index * 7).toString().slice(0, 7)}`;
}

/** Generated vendors so every state/UT has at least one listed partner. */
export function createGeneratedVendors(existing: Vendor[]): Vendor[] {
  const covered = new Set(existing.map((vendor) => vendor.state));
  const rng = mulberry32(DEMO_SEED + 7);
  const vendors: Vendor[] = [];
  INDIA_REGIONS.filter((region) => !covered.has(region.name)).forEach((region, index) => {
    const district = region.districts[0];
    vendors.push({
      id: `V-${(101 + index).toString().padStart(3, '0')}`,
      name: `${region.name.split(' ')[0]} ${VENDOR_SUFFIXES[Math.floor(rng() * VENDOR_SUFFIXES.length)]}`,
      location: `${district}, ${region.name}`,
      state: region.name,
      district,
      rating: Math.round((4 + rng()) * 10) / 10,
      distanceKm: Math.round((1 + rng() * 11) * 10) / 10,
      installations: 18 + Math.floor(rng() * 180),
      empanelled: rng() > 0.15,
      verified: rng() > 0.2,
      active: rng() > 0.1,
      phone: `+91 98XXX ${(40000 + index * 13).toString().slice(0, 5)}`,
      yearsInBusiness: 2 + Math.floor(rng() * 13),
      specialities: [SPECIALITIES[Math.floor(rng() * SPECIALITIES.length)], SPECIALITIES[Math.floor(rng() * SPECIALITIES.length)]],
    });
  });
  return vendors;
}

export interface SeedData {
  applications: Application[];
  audits: SolarAudit[];
  transactions: Transaction[];
}

function repaymentFor(application: Application, rng: () => number): RepaymentState | undefined {
  if (application.loanAmount <= 0) return undefined;
  const disbursed = application.timeline.find((event) => event.status === 'Loan Disbursed');
  if (!disbursed) return undefined;
  const months = Math.max(0, Math.floor((WINDOW_END - new Date(disbursed.at).getTime()) / (30.44 * DAY)));
  const emisDue = Math.min(months, application.tenureMonths || 36);
  const creditQuality = rng();
  let paidOnTime = 0;
  let paidLate = 0;
  let paid30PlusDpd = 0;
  for (let month = 0; month < emisDue; month += 1) {
    const roll = rng();
    const chronic = creditQuality < 0.03;
    const occasional = creditQuality < 0.16;
    if (roll > (chronic ? 0.55 : occasional ? 0.82 : 0.95)) {
      paid30PlusDpd += 1;
      paidLate += 1;
    } else if (roll > (chronic ? 0.25 : occasional ? 0.6 : 0.9)) {
      paidLate += 1;
    } else {
      paidOnTime += 1;
    }
  }
  const paid = paidOnTime + paidLate;
  const outstandingPrincipal = Math.max(0, Math.round(application.loanAmount * (1 - paid / Math.max(1, application.tenureMonths || 36))));
  return { emisDue, paidOnTime, paidLate, paid30PlusDpd, outstandingPrincipal };
}

function emiTransactions(application: Application, rng: () => number): Transaction[] {
  const disbursed = application.timeline.find((event) => event.status === 'Loan Disbursed');
  if (!disbursed || application.loanAmount <= 0) return [];
  const base = new Date(disbursed.at).getTime();
  const months = Math.max(0, Math.floor((WINDOW_END - base) / (30.44 * DAY)));
  const count = Math.min(months, application.tenureMonths || 36);
  const transactions: Transaction[] = [];
  for (let month = 0; month < count; month += 1) {
    const roll = rng();
    const dpd = roll > 0.95 ? 30 + Math.floor(rng() * 60) : roll > 0.84 ? 1 + Math.floor(rng() * 28) : 0;
    const at = base + (month + 1) * 30.44 * DAY + dpd * DAY;
    if (at > WINDOW_END) continue;
    transactions.push({
      id: `TX-${application.id}-EMI-${month + 1}`,
      applicationId: application.id,
      applicantName: application.applicantName,
      kind: 'EMI Repayment',
      direction: 'inflow',
      amountINR: application.emi,
      dpd,
      state: application.state,
      district: application.district,
      discom: application.discom,
      schemeIds: application.schemeIds,
      vendorId: application.vendorId,
      paymentMode: application.paymentMode,
      reference: `NACH/${application.id}/${month + 1}`,
      note: dpd > 0 ? `Received ${dpd} day(s) past due` : 'Auto-debit received on time',
      at: new Date(at).toISOString(),
      byUserId: FINANCE_USER.id,
      byName: FINANCE_USER.name,
      role: 'finance',
      isSeed: true,
    });
  }
  return transactions;
}

/** Transactions are derived from the application timeline — never invented. */
export function createHistoricalTransactions(applications: Application[]): Transaction[] {
  const rng = mulberry32(DEMO_SEED + 11);
  const transactions: Transaction[] = [];
  applications.forEach((application) => {
    const push = (kind: Transaction['kind'], amountINR: number, event: TimelineEvent | undefined, reference: string, note: string): void => {
      if (!event || amountINR <= 0) return;
      transactions.push({
        id: `TX-${application.id}-${kind.replace(/\s+/g, '').toUpperCase()}`,
        applicationId: application.id,
        applicantName: application.applicantName,
        kind,
        direction: kind === 'Loan Disbursed' ? 'outflow' : kind === 'Loan Sanctioned' ? 'none' : 'inflow',
        amountINR,
        state: application.state,
        district: application.district,
        discom: application.discom,
        schemeIds: application.schemeIds,
        vendorId: application.vendorId,
        paymentMode: application.paymentMode,
        reference,
        note,
        at: event.at,
        byUserId: (event.role ?? 'finance') === 'finance' ? FINANCE_USER.id : ADMIN_USER.id,
        byName: event.byName ?? ADMIN_USER.name,
        role: event.role ?? 'finance',
        isSeed: true,
      });
    };
    const at = (status: ApplicationStatus) => application.timeline.find((event) => event.status === status);
    if (application.paymentMode === 'loan') {
      push('Loan Sanctioned', application.loanAmount, at('Loan Sanctioned'), `SANC/${application.id}`, 'Loan sanctioned by the credit team');
      push('Loan Disbursed', application.loanAmount, at('Loan Disbursed'), `NEFT/${application.id}`, 'Loan amount disbursed to the empanelled vendor');
    } else {
      push('Consumer Upfront Payment', application.netCost, at('Installation Scheduled'), `UPI/${application.id}`, 'Upfront payment received from the household');
    }
    push('Subsidy Claimed', application.subsidy, at('Subsidy Claimed'), `CLAIM/${application.id}`, 'Subsidy claim filed on the national portal');
    push('Subsidy Credited', application.subsidy, at('Subsidy Credited'), `DBT/${application.id}`, 'Subsidy credited to the household bank account');
    transactions.push(...emiTransactions(application, rng));
  });
  return transactions.sort((a, b) => (a.at < b.at ? 1 : -1));
}

/**
 * Builds the whole seeded history: applications (with audit trails and
 * repayment state), consumer audits and the derived money-flow transactions.
 */
export function createHistoricalSeed(vendors: Vendor[] = []): SeedData {
  const rng = mulberry32(DEMO_SEED);
  const pool = regionPool();
  const applications: Application[] = [];
  const audits: SolarAudit[] = [];

  for (let index = 0; index < TARGET_APPLICATIONS; index += 1) {
    const region = pool[Math.floor(rng() * pool.length)];
    const district = region.districts[Math.floor(rng() * region.districts.length)];
    const discom = region.discoms[Math.floor(rng() * region.discoms.length)];
    const target = weightedStatus(rng);
    // Later months carry more applications — a growing programme.
    let dayOffset = Math.floor(Math.pow(rng(), 0.72) * ((WINDOW_END - WINDOW_START) / DAY));
    // Early-stage files cannot sit in the queue for months: keep them recent.
    const recentWindow = RECENT_STATUS_WINDOW[target];
    if (recentWindow) {
      const daysFromEnd = (WINDOW_END - (WINDOW_START + dayOffset * DAY)) / DAY;
      if (daysFromEnd > recentWindow) dayOffset = Math.floor((WINDOW_END - WINDOW_START) / DAY) - Math.floor(rng() * recentWindow);
    }
    const createdAt = new Date(WINDOW_START + dayOffset * DAY + Math.floor(rng() * 12) * HOUR).toISOString();
    const monthlyUnits = 90 + Math.floor(rng() * 520);
    const monthlyBill = Math.round(monthlyUnits * (7.4 + rng() * 2.1));
    const rec = calculateSolarRecommendation(monthlyUnits, region.name, monthlyBill);
    const financed = rng() > 0.36 && rec.netCost > 20000;
    const paymentMode: PaymentMode = financed ? 'loan' : 'upfront';
    const loanAmount = financed ? rec.netCost : 0;
    const loan = calculateLoanSummary(loanAmount, 7.5, 36);
    const { timeline, status } = buildTimeline({ createdAt, target, paymentMode, applicantIndex: index, rng });
    const id = `SM-2026-${2001 + index}`;
    const applicantName = `${FIRST_NAMES[Math.floor(rng() * FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(rng() * LAST_NAMES.length)]}`;
    const assignmentRoll = rng();
    const assignedTo =
      assignmentRoll < 0.34
        ? undefined
        : assignmentRoll < 0.74
          ? { userId: AGENT_USER.id, name: AGENT_USER.name, at: timeline[0].at, byUserId: ADMIN_USER.id, byName: ADMIN_USER.name }
          : assignmentRoll < 0.9
            ? { userId: ADMIN_USER.id, name: ADMIN_USER.name, at: timeline[0].at }
            : { userId: FINANCE_USER.id, name: FINANCE_USER.name, at: timeline[0].at, byUserId: ADMIN_USER.id, byName: ADMIN_USER.name };
    const estimatedMonthlyGeneration = rec.estimatedMonthlyGeneration;
    const application: Application = {
      id,
      applicantName,
      phone: `9${(700000000 + index * 977).toString().slice(0, 9)}`,
      consumerNumber: makeConsumerNumber(region, discom, index),
      location: `${district}, ${region.code}`,
      state: region.name,
      district,
      discom,
      monthlyUnits,
      monthlyBill,
      systemKW: rec.recommendedKW,
      marketCost: rec.marketCost,
      centralSubsidy: rec.centralSubsidy,
      stateSubsidy: rec.stateSubsidy,
      subsidy: rec.totalSubsidy,
      netCost: rec.netCost,
      loanAmount,
      interestRate: financed ? 7.5 : 0,
      tenureMonths: financed ? 36 : 0,
      emi: loan.emi,
      paymentMode,
      schemeIds: defaultSchemeIdsForState(region.name),
      vendorId: '',
      status,
      timeline,
      assignedTo,
      estimatedMonthlyGeneration,
      estimatedMonthlySavings: calculateMonthlySavings(monthlyUnits, monthlyBill, estimatedMonthlyGeneration),
      isSeed: true,
      createdAt,
      updatedAt: timeline[timeline.length - 1].at,
    };
    application.repayment = repaymentFor(application, rng);
    applications.push(application);
  }

  applications.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  // Vendors per region are assigned after generation from the real vendor list.
  const vendorByState = new Map<string, string[]>();
  vendors.forEach((vendor) => {
    const list = vendorByState.get(vendor.state) ?? [];
    list.push(vendor.id);
    vendorByState.set(vendor.state, list);
  });
  applications.forEach((application, index) => {
    const candidates = vendorByState.get(application.state) ?? vendors.map((vendor) => vendor.id);
    application.vendorId = candidates.length > 0 ? candidates[index % candidates.length] : 'V-001';
  });

  // Every application is preceded by its own solar audit (the funnel's top
  // stage is real, not assumed) — then top up with audits that never converted.
  applications.forEach((application, index) => {
    const leadHours = 6 + Math.floor(rng() * 72);
    const auditId = `AUD-26${(index + 1).toString().padStart(5, '0')}`;
    application.auditId = auditId;
    audits.push({
      id: auditId,
      state: application.state,
      district: application.district,
      discom: application.discom,
      monthlyUnits: application.monthlyUnits,
      monthlyBill: application.monthlyBill,
      recommendedKW: application.systemKW,
      marketCost: application.marketCost,
      subsidy: application.subsidy,
      centralSubsidy: application.centralSubsidy,
      stateSupport: application.stateSubsidy,
      netCost: application.netCost,
      estimatedMonthlyGeneration: application.estimatedMonthlyGeneration,
      estimatedMonthlySavings: application.estimatedMonthlySavings,
      createdAt: new Date(new Date(application.createdAt).getTime() - leadHours * HOUR).toISOString(),
    });
  });

  const standaloneAudits = Math.max(0, TARGET_AUDITS - audits.length);
  for (let index = 0; index < standaloneAudits; index += 1) {
    const region = pool[Math.floor(rng() * pool.length)];
    const district = region.districts[Math.floor(rng() * region.districts.length)];
    const discom = region.discoms[Math.floor(rng() * region.discoms.length)];
    const dayOffset = Math.floor(Math.pow(rng(), 0.7) * ((WINDOW_END - WINDOW_START) / DAY));
    const monthlyUnits = 80 + Math.floor(rng() * 540);
    const monthlyBill = Math.round(monthlyUnits * (7.4 + rng() * 2.1));
    const rec = calculateSolarRecommendation(monthlyUnits, region.name, monthlyBill);
    audits.push({
      id: `AUD-26${(audits.length + 1).toString().padStart(5, '0')}`,
      state: region.name,
      district,
      discom,
      monthlyUnits,
      monthlyBill,
      recommendedKW: rec.recommendedKW,
      marketCost: rec.marketCost,
      subsidy: rec.totalSubsidy,
      centralSubsidy: rec.centralSubsidy,
      stateSupport: rec.stateSubsidy,
      netCost: rec.netCost,
      estimatedMonthlyGeneration: rec.estimatedMonthlyGeneration,
      estimatedMonthlySavings: rec.estimatedMonthlySavings,
      createdAt: new Date(WINDOW_START + dayOffset * DAY + Math.floor(rng() * 20) * HOUR).toISOString(),
    });
  }

  return { applications, audits, transactions: createHistoricalTransactions(applications) };
}
