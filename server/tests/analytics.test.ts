import { describe, expect, it } from 'vitest';
import { createFullSeed } from '../src/data/mockDatabase';
import { buildMonthly, buildOverview, buildRegional, buildTransactionSummary } from '../src/services/analyticsService';
import { resolvePeriod, toRecordFilters } from '../src/services/filters';
import { APPLICATION_STATUSES, isLive, type ApplicationStatus } from '../src/config/statusFlow';
import type { Application, SolarAudit, TimelineEvent, Transaction } from '../src/types';

const seed = createFullSeed();

const event = (status: ApplicationStatus, at: string): TimelineEvent => ({ status, note: status, at });

function makeApplication(overrides: Partial<Application> & { id: string; status: ApplicationStatus; timeline: TimelineEvent[] }): Application {
  return {
    applicantName: 'Test Household',
    phone: '9876500000',
    location: 'Test, UP',
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
    schemeIds: ['pm-surya-ghar-rts'],
    vendorId: 'V-001',
    estimatedMonthlyGeneration: 360,
    estimatedMonthlySavings: 2800,
    isSeed: true,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-20T00:00:00.000Z',
    ...overrides,
  };
}

const overviewFor = (applications: Application[], transactions: Transaction[] = [], audits: SolarAudit[] = [], raw: Record<string, unknown> = {}) =>
  buildOverview({ applications, audits, transactions, filters: toRecordFilters(raw as never) });

describe('analytics are aggregated from records', () => {
  it('counts only commissioned systems as live', () => {
    const applications = [
      makeApplication({ id: 'A1', status: 'Approved', timeline: [event('Approved', '2026-09-05T00:00:00.000Z')] }),
      makeApplication({ id: 'A2', status: 'Installed', timeline: [event('Installed', '2026-09-06T00:00:00.000Z')] }),
      makeApplication({ id: 'A3', status: 'Net Meter Commissioned', timeline: [event('Net Meter Commissioned', '2026-09-07T00:00:00.000Z')] }),
      makeApplication({ id: 'A4', status: 'Completed', timeline: [event('Net Meter Commissioned', '2026-08-01T00:00:00.000Z'), event('Completed', '2026-08-10T00:00:00.000Z')] }),
    ];
    const overview = overviewFor(applications);
    expect(overview.climate.systemsLive).toBe(2);
    expect(overview.climate.installedKW).toBe(6);
    expect(overview.pipeline.byStatus.Installed).toBe(1);
  });

  it('never counts Approved as disbursed and reports sanctioned vs disbursed separately', () => {
    const applications = [
      makeApplication({ id: 'B1', status: 'Approved', timeline: [event('Approved', '2026-09-05T00:00:00.000Z')] }),
      makeApplication({
        id: 'B2',
        status: 'Loan Disbursed',
        timeline: [event('Approved', '2026-09-04T00:00:00.000Z'), event('Loan Sanctioned', '2026-09-05T00:00:00.000Z'), event('Loan Disbursed', '2026-09-08T00:00:00.000Z')],
      }),
    ];
    const transactions: Transaction[] = [
      { id: 'T1', applicationId: 'B2', applicantName: 'Test', kind: 'Loan Sanctioned', direction: 'none', amountINR: 57000, state: 'Uttar Pradesh', schemeIds: [], paymentMode: 'loan', at: '2026-09-05T00:00:00.000Z', byUserId: 'U-FIN-1', byName: 'Ravi Menon', role: 'finance', isSeed: true },
      { id: 'T2', applicationId: 'B2', applicantName: 'Test', kind: 'Loan Disbursed', direction: 'outflow', amountINR: 57000, state: 'Uttar Pradesh', schemeIds: [], paymentMode: 'loan', at: '2026-09-08T00:00:00.000Z', byUserId: 'U-FIN-1', byName: 'Ravi Menon', role: 'finance', isSeed: true },
    ];
    const overview = overviewFor(applications, transactions);
    expect(overview.finance.sanctioned).toMatchObject({ count: 1, amountINR: 57000 });
    expect(overview.finance.disbursed).toMatchObject({ count: 1, amountINR: 57000 });
    expect(overview.finance.avgTicketINR).toBe(57000);
    expect(overview.finance.financedSharePercent).toBe(100);
    expect(overview.finance.outstandingPrincipalINR).toBe(0);
  });

  it('respects the active filters across every section', () => {
    const filtered = buildOverview({
      applications: seed.applications,
      audits: seed.audits,
      transactions: seed.transactions,
      filters: toRecordFilters({ state: ['Gujarat'], paymentMode: 'loan' }),
    });
    const gujaratLoan = seed.applications.filter((application) => application.state === 'Gujarat' && application.paymentMode === 'loan');
    expect(filtered.pipeline.total).toBe(gujaratLoan.length);
    expect(filtered.climate.systemsLive).toBe(gujaratLoan.filter((application) => isLive(application.status)).length);
    expect(filtered.finance.financedSharePercent).toBe(100);

    const unmatched = buildOverview({
      applications: seed.applications,
      audits: [],
      transactions: [],
      filters: toRecordFilters({ state: ['Lakshadweep'] }),
    });
    expect(unmatched.pipeline.total).toBe(0);
    expect(unmatched.climate.systemsLive).toBe(0);
    expect(unmatched.finance.avgTicketINR).toBe(0);
    expect(unmatched.operations.oldestWaitingLabel).toBe('none');
  });

  it('compares the current period with the previous period of equal length', () => {
    const applications = [
      makeApplication({ id: 'C1', status: 'Net Meter Commissioned', createdAt: '2026-09-20T00:00:00.000Z', timeline: [event('Net Meter Commissioned', '2026-09-22T00:00:00.000Z')] }),
      makeApplication({ id: 'C2', status: 'Net Meter Commissioned', createdAt: '2026-09-21T00:00:00.000Z', timeline: [event('Net Meter Commissioned', '2026-09-23T00:00:00.000Z')] }),
      makeApplication({ id: 'C3', status: 'Net Meter Commissioned', createdAt: '2026-08-01T00:00:00.000Z', timeline: [event('Net Meter Commissioned', '2026-08-03T00:00:00.000Z')] }),
    ];
    const period = resolvePeriod(toRecordFilters({ from: '2026-09-01', to: '2026-09-30' }), '2026-09-30T00:00:00.000Z');
    expect(period.days).toBe(30);
    expect(period.previousFrom.slice(0, 10)).toBe('2026-08-02');
    const overview = overviewFor(applications, [], [], { from: '2026-09-01', to: '2026-09-30' });
    expect(overview.climate.change.systemsLive).toBe(100); // 2 vs 1
    expect(overview.period.label).toBe('2026-09-01 → 2026-09-30');
  });

  it('derives subsidy claimed vs credited, savings and instal→credit delay from records', () => {
    const applications = [
      makeApplication({
        id: 'D1',
        status: 'Completed',
        timeline: [event('Net Meter Commissioned', '2026-06-01T00:00:00.000Z'), event('Subsidy Credited', '2026-09-10T00:00:00.000Z')],
      }),
    ];
    const transactions: Transaction[] = [
      { id: 'T3', applicationId: 'D1', applicantName: 'Test', kind: 'Subsidy Claimed', direction: 'inflow', amountINR: 108000, state: 'Uttar Pradesh', schemeIds: [], paymentMode: 'loan', at: '2026-08-20T00:00:00.000Z', byUserId: 'U-ADMIN', byName: 'Demo Operator', role: 'admin', isSeed: true },
      { id: 'T4', applicationId: 'D1', applicantName: 'Test', kind: 'Subsidy Credited', direction: 'inflow', amountINR: 108000, state: 'Uttar Pradesh', schemeIds: [], paymentMode: 'loan', at: '2026-09-10T00:00:00.000Z', byUserId: 'U-FIN-1', byName: 'Ravi Menon', role: 'finance', isSeed: true },
    ];
    const overview = overviewFor(applications, transactions, [], { from: '2026-08-01', to: '2026-09-30' });
    expect(overview.period.days).toBe(61);
    expect(overview.subsidy.claimed).toMatchObject({ count: 1, amountINR: 108000 });
    expect(overview.subsidy.credited).toMatchObject({ count: 1, amountINR: 108000 });
    expect(overview.subsidy.avgDaysInstallToCredit).toBeCloseTo(101, 0);
    expect(overview.subsidy.householdSavings.monthlyINR).toBe(2800);
    expect(overview.subsidy.householdSavings.avgMonthlyPerHouseholdINR).toBe(2800);
  });

  it('reports money flow split into inflow and outflow', () => {
    const summary = buildTransactionSummary({ applications: seed.applications, audits: [], transactions: seed.transactions, filters: toRecordFilters({}) });
    expect(summary.inflowINR).toBeGreaterThan(0);
    expect(summary.outflowINR).toBeGreaterThan(0);
    const byKindTotal = summary.byKind.reduce((sum, entry) => sum + entry.amountINR, 0);
    expect(byKindTotal).toBe(summary.totalINR);
    expect(summary.byMonth.length).toBeGreaterThan(0);
  });

  it('returns all 36 regions (zeros included) and never NaN', () => {
    const regional = buildRegional({ applications: seed.applications, audits: seed.audits, transactions: seed.transactions, filters: toRecordFilters({}) });
    expect(regional).toHaveLength(36);
    regional.forEach((row) => {
      expect(Number.isFinite(row.applications)).toBe(true);
      expect(Number.isFinite(row.capacityKW)).toBe(true);
      expect(Number.isFinite(row.loansINR)).toBe(true);
      expect(row.applications).toBeGreaterThanOrEqual(0);
      expect(row.capacityKW).toBeGreaterThanOrEqual(0);
    });
    const empty = regional.filter((row) => row.applications === 0);
    expect(empty.length).toBeGreaterThan(0);
    empty.forEach((row) => expect(row.capacityKW).toBe(0));
  });

  it('builds a consecutive monthly series with cumulative totals', () => {
    const monthly = buildMonthly({ applications: seed.applications, audits: [], transactions: seed.transactions, filters: toRecordFilters({}) });
    expect(monthly.length).toBeGreaterThanOrEqual(8);
    monthly.forEach((point, index) => {
      expect(point.installations).toBeGreaterThanOrEqual(0);
      if (index > 0) {
        expect(point.cumulativeLoansLakh).toBeGreaterThanOrEqual(monthly[index - 1].cumulativeLoansLakh - 0.01);
        expect(point.cumulativeCO2).toBeGreaterThanOrEqual(monthly[index - 1].cumulativeCO2 - 0.01);
      }
    });
  });

  it('produces a monotonic operations funnel in the agreed order', () => {
    const overview = overviewFor(seed.applications, seed.transactions, seed.audits);
    expect(overview.operations.funnel.map((stage) => stage.key)).toEqual(['audits', 'applications', 'approved', 'installed', 'commissioned', 'subsidy-credited']);
    expect(overview.operations.funnel[0].conversionFromPrevious).toBeNull();
    // A funnel must never widen: every stage is a subset of the one before it.
    overview.operations.funnel.slice(1).forEach((stage, index) => {
      expect(stage.value).toBeLessThanOrEqual(overview.operations.funnel[index].value);
    });
    expect(overview.operations.loanBranch.disbursed).toBeLessThanOrEqual(overview.operations.loanBranch.financedApplications);
    expect(overview.operations.approvalRatePercent).toBeGreaterThan(0);
    expect(overview.operations.approvalRatePercent).toBeLessThanOrEqual(100);
    expect(overview.operations.medianTimeToDecisionHours).toBeGreaterThan(0);
  });

  it('contains no NaN or Infinity anywhere in the overview payload', () => {
    const overview = overviewFor(seed.applications, seed.transactions, seed.audits);
    const walk = (value: unknown): void => {
      if (typeof value === 'number') expect(Number.isFinite(value)).toBe(true);
      else if (Array.isArray(value)) value.forEach(walk);
      else if (value && typeof value === 'object') Object.values(value).forEach(walk);
    };
    walk(overview);
    expect(Object.keys(overview.pipeline.byStatus).sort()).toEqual([...APPLICATION_STATUSES].sort());
  });

  it('keeps repayment health bounded to 0-100%', () => {
    const overview = overviewFor(seed.applications, seed.transactions, seed.audits);
    expect(overview.finance.repayment.onTimePercent).toBeGreaterThan(0);
    expect(overview.finance.repayment.onTimePercent).toBeLessThanOrEqual(100);
    expect(overview.finance.repayment.dpd30PlusPercent).toBeGreaterThanOrEqual(0);
    expect(overview.finance.repayment.dpd30PlusPercent).toBeLessThanOrEqual(100);
    expect(overview.finance.repayment.emisDue).toBeGreaterThanOrEqual(overview.finance.repayment.paidOnTime);
  });
});
