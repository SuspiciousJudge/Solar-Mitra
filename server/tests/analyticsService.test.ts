import { describe, expect, it } from 'vitest';
import { DEMO_POLICY } from '../src/config/policyConfig';
import { EMPTY_FILTERS, type RecordFilters } from '../src/services/filters';
import { buildFunnel, buildMonthly, buildOverview, buildRegional, buildTransactionSummary } from '../src/services/analyticsService';
import type { Application, SolarAudit, Transaction, TimelineEvent } from '../src/types';

const event = (status: TimelineEvent['status'], at: string): TimelineEvent => ({ status, note: `${status}`, at });

const base: Application = {
  id: 'A1',
  applicantName: 'Asha Devi',
  phone: '9876500001',
  location: 'Kanpur, UP',
  state: 'Uttar Pradesh',
  district: 'Kanpur Nagar',
  discom: 'PVVNL',
  monthlyUnits: 350,
  monthlyBill: 2800,
  systemKW: 3,
  marketCost: 165000,
  centralSubsidy: 78000,
  stateSubsidy: 30000,
  subsidy: 108000,
  netCost: 57000,
  loanAmount: 57000,
  interestRate: 7.5,
  tenureMonths: 36,
  emi: 1773,
  paymentMode: 'loan',
  schemeIds: ['pm-surya-ghar-rts', 'up-rts-topup'],
  vendorId: 'V-001',
  status: 'Approved',
  timeline: [event('Submitted', '2026-07-01T00:00:00.000Z'), event('Approved', '2026-07-05T00:00:00.000Z')],
  estimatedMonthlyGeneration: 360,
  estimatedMonthlySavings: 2400,
  isSeed: true,
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-05T00:00:00.000Z',
};

const live: Application = {
  ...base,
  id: 'A2',
  applicantName: 'Ramesh Patel',
  phone: '9876500002',
  state: 'Gujarat',
  district: 'Rajkot',
  discom: 'PGVCL',
  paymentMode: 'loan',
  status: 'Net Meter Commissioned',
  schemeIds: ['pm-surya-ghar-rts', 'gj-rts-topup'],
  stateSubsidy: 20000,
  timeline: [
    event('Submitted', '2026-05-02T00:00:00.000Z'),
    event('Approved', '2026-05-06T00:00:00.000Z'),
    event('Loan Sanctioned', '2026-05-10T00:00:00.000Z'),
    event('Loan Disbursed', '2026-05-12T00:00:00.000Z'),
    event('Installation Scheduled', '2026-05-20T00:00:00.000Z'),
    event('Installed', '2026-06-02T00:00:00.000Z'),
    event('Net Meter Commissioned', '2026-06-10T00:00:00.000Z'),
  ],
  repayment: { emisDue: 4, paidOnTime: 3, paidLate: 1, paid30PlusDpd: 1, outstandingPrincipal: 40000 },
  createdAt: '2026-05-02T00:00:00.000Z',
  updatedAt: '2026-09-02T00:00:00.000Z',
};

const upfront: Application = {
  ...base,
  id: 'A3',
  applicantName: 'Meena Rao',
  phone: '9876500003',
  state: 'Karnataka',
  district: 'Bengaluru Urban',
  discom: 'BESCOM',
  paymentMode: 'upfront',
  loanAmount: 0,
  interestRate: 0,
  tenureMonths: 0,
  emi: 0,
  status: 'Completed',
  schemeIds: ['pm-surya-ghar-rts'],
  timeline: [
    event('Submitted', '2026-03-01T00:00:00.000Z'),
    event('Approved', '2026-03-04T00:00:00.000Z'),
    event('Installation Scheduled', '2026-03-10T00:00:00.000Z'),
    event('Installed', '2026-03-25T00:00:00.000Z'),
    event('Net Meter Commissioned', '2026-04-05T00:00:00.000Z'),
    event('Subsidy Claimed', '2026-04-15T00:00:00.000Z'),
    event('Subsidy Credited', '2026-05-20T00:00:00.000Z'),
    event('Completed', '2026-05-22T00:00:00.000Z'),
  ],
  createdAt: '2026-03-01T00:00:00.000Z',
  updatedAt: '2026-09-20T00:00:00.000Z',
};

const applications = [base, live, upfront];

const transactions: Transaction[] = [
  {
    id: 'TX-1',
    applicationId: 'A2',
    applicantName: 'Ramesh Patel',
    kind: 'Loan Disbursed',
    direction: 'outflow',
    amountINR: 57000,
    state: 'Gujarat',
    district: 'Rajkot',
    schemeIds: live.schemeIds,
    vendorId: 'V-001',
    paymentMode: 'loan',
    at: '2026-09-05T00:00:00.000Z',
    byUserId: 'U-FIN-1',
    byName: 'Ravi Menon',
    role: 'finance',
    isSeed: true,
  },
  {
    id: 'TX-2',
    applicationId: 'A2',
    applicantName: 'Ramesh Patel',
    kind: 'EMI Repayment',
    direction: 'inflow',
    amountINR: 1773,
    dpd: 34,
    state: 'Gujarat',
    district: 'Rajkot',
    schemeIds: live.schemeIds,
    paymentMode: 'loan',
    at: '2026-09-06T00:00:00.000Z',
    byUserId: 'U-FIN-1',
    byName: 'Ravi Menon',
    role: 'finance',
    isSeed: true,
  },
  {
    id: 'TX-3',
    applicationId: 'A3',
    applicantName: 'Meena Rao',
    kind: 'Subsidy Credited',
    direction: 'inflow',
    amountINR: 78000,
    state: 'Karnataka',
    district: 'Bengaluru Urban',
    schemeIds: upfront.schemeIds,
    paymentMode: 'upfront',
    at: '2026-09-08T00:00:00.000Z',
    byUserId: 'U-FIN-1',
    byName: 'Ravi Menon',
    role: 'finance',
    isSeed: true,
  },
];

const audits: SolarAudit[] = [
  {
    id: 'AUD-1',
    state: 'Gujarat',
    district: 'Rajkot',
    discom: 'PGVCL',
    monthlyUnits: 350,
    monthlyBill: 2800,
    recommendedKW: 3,
    marketCost: 165000,
    subsidy: 108000,
    centralSubsidy: 78000,
    stateSupport: 20000,
    netCost: 57000,
    estimatedMonthlyGeneration: 360,
    estimatedMonthlySavings: 2400,
    createdAt: '2026-09-02T00:00:00.000Z',
  },
];

// Every application is preceded by its own audit, exactly like the seeded history.
const auditFor = (application: Application, id: string): SolarAudit => ({
  ...audits[0],
  id,
  state: application.state,
  district: application.district,
  discom: application.discom,
  monthlyUnits: application.monthlyUnits,
  monthlyBill: application.monthlyBill,
  recommendedKW: application.systemKW,
  createdAt: new Date(new Date(application.createdAt).getTime() - 12 * 3_600_000).toISOString(),
});

const auditsInScope: SolarAudit[] = [audits[0], auditFor(live, 'AUD-2'), auditFor(upfront, 'AUD-3')];

const asOf = new Date('2026-09-30T00:00:00.000Z');
const filters = (overrides: Partial<RecordFilters> = {}): RecordFilters => ({ ...EMPTY_FILTERS, ...overrides });
const overview = (overrides: Partial<RecordFilters> = {}) => buildOverview({ applications, audits, transactions, filters: filters(overrides), asOf });

describe('analytics builders', () => {
  it('only counts commissioned systems as live capacity', () => {
    const result = overview();
    expect(result.climate.systemsLive).toBe(2); // A2 commissioned, A3 completed
    expect(result.climate.installedKW).toBe(6);
    expect(result.pipeline.live).toBe(2);
    expect(result.pipeline.byStatus.Approved).toBe(1);
    expect(result.pipeline.total).toBe(3);
  });

  it('reports sanctioned and disbursed separately (Approved ≠ disbursed)', () => {
    const result = overview({ from: '2026-09-01', to: '2026-09-30' });
    expect(result.finance.disbursed).toEqual({ count: 1, amountINR: 57000 });
    expect(result.finance.sanctioned).toEqual({ count: 0, amountINR: 0 });
    expect(result.finance.avgTicketINR).toBe(57000);
    expect(result.finance.repayment.onTimePercent).toBe(75);
    expect(result.finance.repayment.dpd30PlusPercent).toBe(25);
    expect(result.finance.outstandingPrincipalINR).toBe(40000);
  });

  it('separates subsidy claimed from subsidy credited', () => {
    const result = overview({ from: '2026-09-01', to: '2026-09-30' });
    expect(result.subsidy.claimed).toEqual({ count: 0, amountINR: 0 });
    expect(result.subsidy.credited).toEqual({ count: 1, amountINR: 78000 });
    expect(result.subsidy.householdSavings.monthlyINR).toBe(4800);
  });

  it('agrees with the filter selection across every section', () => {
    const gujarat = overview({ states: ['Gujarat'], from: '2026-09-01', to: '2026-09-30' });
    expect(gujarat.pipeline.total).toBe(1);
    expect(gujarat.climate.systemsLive).toBe(1);
    expect(gujarat.finance.disbursed.count).toBe(1);
    expect(gujarat.dataPoints.applications).toBe(1);

    const upfrontOnly = overview({ paymentMode: 'upfront' });
    expect(upfrontOnly.pipeline.total).toBe(1);
    expect(upfrontOnly.finance.disbursed).toEqual({ count: 0, amountINR: 0 });
  });

  it('respects the date range on money movements', () => {
    const august = overview({ from: '2026-08-01', to: '2026-08-31' });
    expect(august.finance.disbursed.count).toBe(0);
    expect(august.moneyFlow.inflowINR).toBe(0);
    expect(august.period.days).toBe(31);
  });

  it('computes money flow splitting inflow and outflow', () => {
    const result = overview({ from: '2026-09-01', to: '2026-09-30' });
    expect(result.moneyFlow.outflowINR).toBe(57000);
    expect(result.moneyFlow.inflowINR).toBe(79773);
    expect(result.moneyFlow.netINR).toBe(22773);
  });

  it('produces a monotonic milestone funnel with conversion percentages', () => {
    const stages = buildFunnel({ applications, audits: auditsInScope, transactions, filters: filters({ from: '2026-03-01', to: '2026-09-30' }), asOf });
    expect(stages.map((stage) => stage.key)).toEqual(['audits', 'applications', 'approved', 'installed', 'commissioned', 'subsidy-credited']);
    expect(stages[0].conversionFromPrevious).toBeNull();
    stages.slice(1).forEach((stage, index) => {
      expect(stage.value).toBeLessThanOrEqual(stages[index].value);
      expect(stage.conversionFromPrevious === null || Number.isFinite(stage.conversionFromPrevious)).toBe(true);
    });
    // All three are approved; only A2/A3 were installed and only A3 got paid.
    expect(stages.find((stage) => stage.key === 'applications')?.value).toBe(3);
    expect(stages.find((stage) => stage.key === 'approved')?.value).toBe(3);
    expect(stages.find((stage) => stage.key === 'commissioned')?.value).toBe(2);
    expect(stages.find((stage) => stage.key === 'subsidy-credited')?.value).toBe(1);
  });

  it('reports the financed loan branch separately from the linear funnel', () => {
    const result = overview({ from: '2026-05-01', to: '2026-09-30' });
    expect(result.operations.loanBranch.financedApplications).toBe(2); // A1 and A2
    expect(result.operations.loanBranch.disbursed).toBe(1); // only A2
    expect(result.operations.loanBranch.conversionFromFinanced).toBe(50);
  });

  it('returns all 36 regions with zeros included', () => {
    const regional = buildRegional({ applications, audits, transactions, filters: filters(), asOf });
    expect(regional).toHaveLength(36);
    const kerala = regional.find((row) => row.state === 'Kerala');
    expect(kerala).toMatchObject({ applications: 0, capacityKW: 0, loansINR: 0 });
    const gujarat = regional.find((row) => row.state === 'Gujarat');
    expect(gujarat?.systemsLive).toBe(1);
    expect(gujarat?.loansINR).toBe(57000);
  });

  it('builds a contiguous monthly series with monotonic cumulative values', () => {
    const monthly = buildMonthly({ applications, audits, transactions, filters: filters(), asOf });
    expect(monthly.length).toBeGreaterThanOrEqual(5);
    monthly.forEach((point, index) => {
      expect(Number.isFinite(point.co2Tonnes)).toBe(true);
      if (index > 0) {
        expect(point.cumulativeLoansLakh).toBeGreaterThanOrEqual(monthly[index - 1].cumulativeLoansLakh);
        expect(point.cumulativeCO2).toBeGreaterThanOrEqual(monthly[index - 1].cumulativeCO2);
      }
    });
    const september = monthly.find((point) => point.key === '2026-09');
    expect(september?.loansLakh).toBe(0.57);
  });

  it('summarises transactions for the ledger header', () => {
    const summary = buildTransactionSummary({ applications, audits, transactions, filters: filters({ from: '2026-09-01', to: '2026-09-30' }), asOf });
    expect(summary.totalCount).toBe(3);
    expect(summary.totalINR).toBe(136773);
    expect(summary.byKind.map((entry) => entry.kind).sort()).toEqual(['EMI Repayment', 'Loan Disbursed', 'Subsidy Credited']);
    expect(summary.byMonth[0]).toMatchObject({ key: '2026-09' });
    expect(summary.byKind.find((entry) => entry.kind === 'Loan Disbursed')?.direction).toBe('outflow');
  });

  it('derives climate metrics from the demo policy assumptions', () => {
    const result = overview();
    const expectedKWh = 6 * DEMO_POLICY.unitPerKW * 12;
    expect(result.climate.estAnnualKWh).toBe(expectedKWh);
    expect(result.climate.methodology.unitPerKW).toBe(DEMO_POLICY.unitPerKW);
    expect(result.climate.co2AvoidedTonnes).toBeGreaterThan(0);
    expect(result.climate.equivalentTrees).toBeGreaterThan(0);
  });

  it('never emits NaN or Infinity anywhere', () => {
    const walk = (value: unknown): void => {
      if (typeof value === 'number') expect(Number.isFinite(value)).toBe(true);
      else if (Array.isArray(value)) value.forEach(walk);
      else if (value && typeof value === 'object') Object.values(value).forEach(walk);
    };
    walk(overview({ states: ['Lakshadweep'] }).climate);
    walk(overview({ states: ['Lakshadweep'] }).finance);
    walk(overview({ states: ['Lakshadweep'] }));
  });
});
