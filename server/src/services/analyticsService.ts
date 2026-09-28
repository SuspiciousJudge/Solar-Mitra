/**
 * Analytics are aggregated from the same records the operator console lists, so
 * a KPI and the CSV export underneath it can never disagree. Every builder
 * takes the validated filter object (see `services/filters.ts`) and returns the
 * declared contract from `types/analytics.ts`.
 */
import { MILESTONE_ORDER, isLive, type ApplicationStatus } from '../config/statusFlow';
import { DEMO_GRID_EMISSION_FACTOR, DEMO_KG_CO2_PER_TREE_PER_YEAR, DEMO_POLICY } from '../config/policyConfig';
import { INDIA_REGIONS } from '../data/indiaRegions';
import type { Application, SolarAudit, Transaction, TransactionKind } from '../types';
import type {
  AnalyticsOverview,
  FunnelStage,
  MonthlyPoint,
  RegionalPoint,
  TransactionSummary,
} from '../types/analytics';
import { computeAgeing, lastEventAt } from '../utils/ageing';
import {
  EMPTY_FILTERS,
  inPeriod,
  matchesAttributes,
  matchesAuditAttributes,
  matchesTransactionAttributes,
  resolvePeriod,
  toAppliedFilters,
  percentChange,
  type PeriodRange,
  type RecordFilters,
} from './filters';

export interface AnalyticsInput {
  applications: Application[];
  audits: SolarAudit[];
  transactions: Transaction[];
  filters: RecordFilters;
  /** Overridable for tests; defaults to the newest record in the dataset. */
  asOf?: Date;
}

const DAY_MS = 86_400_000;
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const round = (value: number, decimals = 0) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return round(sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle], 1);
}

const monthKey = (timestamp: string) => timestamp.slice(0, 7);
const monthLabel = (key: string) => {
  const [year, month] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
};

/** Timestamp of a milestone event in the application timeline. */
function eventAt(application: Application, status: ApplicationStatus): string | undefined {
  return application.timeline.find((event) => event.status === status)?.at;
}

function latestTimestamp(input: AnalyticsInput): Date {
  const stamps = [
    ...input.applications.map((application) => application.updatedAt ?? application.createdAt),
    ...input.transactions.map((transaction) => transaction.at),
    ...input.audits.map((audit) => audit.createdAt),
  ].filter(Boolean);
  const newest = [...stamps].sort().at(-1);
  return newest ? new Date(newest) : new Date();
}

interface Scoped {
  asOf: Date;
  period: PeriodRange;
  /** Attribute-matched, cumulative. */
  matched: Application[];
  /** Attribute-matched applications created inside the period. */
  cohort: Application[];
  matchedTransactions: Transaction[];
  matchedAudits: SolarAudit[];
  auditsInPeriod: SolarAudit[];
}

function scope(input: AnalyticsInput): Scoped {
  const filters = input.filters ?? EMPTY_FILTERS;
  const matched = input.applications.filter((application) => matchesAttributes(application, filters));
  const matchedTransactions = input.transactions.filter((transaction) => matchesTransactionAttributes(transaction, filters));
  const matchedAudits = input.audits.filter((audit) => matchesAuditAttributes(audit, filters));
  const asOf = input.asOf ?? latestTimestamp(input);
  const period = resolvePeriod(filters, asOf.toISOString());
  return {
    asOf,
    period,
    matched,
    cohort: matched.filter((application) => inPeriod(application.createdAt, period)),
    matchedTransactions,
    matchedAudits,
    auditsInPeriod: matchedAudits.filter((audit) => inPeriod(audit.createdAt, period)),
  };
}

const co2Tonnes = (kw: number) => round((kw * DEMO_POLICY.unitPerKW * 12 * DEMO_GRID_EMISSION_FACTOR) / 1000, 1);

const hoursBetween = (from: string | undefined, to: string | undefined): number | null => {
  if (!from || !to) return null;
  const hours = (new Date(to).getTime() - new Date(from).getTime()) / 3_600_000;
  return Number.isFinite(hours) && hours >= 0 ? round(hours, 1) : null;
};

// ── Period activity ─────────────────────────────────────────────────────────

interface PeriodCounts {
  liveAdded: number;
  liveAddedKW: number;
  sanctioned: { count: number; amountINR: number };
  disbursed: { count: number; amountINR: number };
  claimed: { count: number; amountINR: number };
  credited: { count: number; amountINR: number };
  approved: number;
  rejected: number;
  installed: number;
  applicationsCreated: number;
  audits: number;
}

function periodCounts(scoped: Scoped, period: PeriodRange = scoped.period): PeriodCounts {
  const { matched, matchedTransactions } = scoped;
  const transactionsOf = (kind: TransactionKind) =>
    matchedTransactions.filter((transaction) => transaction.kind === kind && inPeriod(transaction.at, period));

  const commissioned = matched.filter((application) => inPeriod(eventAt(application, 'Net Meter Commissioned'), period));
  const sanctioned = transactionsOf('Loan Sanctioned');
  const disbursed = transactionsOf('Loan Disbursed');
  const claimed = transactionsOf('Subsidy Claimed');
  const credited = transactionsOf('Subsidy Credited');

  return {
    liveAdded: commissioned.length,
    liveAddedKW: round(sum(commissioned.map((application) => application.systemKW)), 1),
    sanctioned: { count: sanctioned.length, amountINR: round(sum(sanctioned.map((transaction) => transaction.amountINR))) },
    disbursed: { count: disbursed.length, amountINR: round(sum(disbursed.map((transaction) => transaction.amountINR))) },
    claimed: { count: claimed.length, amountINR: round(sum(claimed.map((transaction) => transaction.amountINR))) },
    credited: { count: credited.length, amountINR: round(sum(credited.map((transaction) => transaction.amountINR))) },
    approved: matched.filter((application) => inPeriod(eventAt(application, 'Approved'), period)).length,
    rejected: matched.filter((application) => inPeriod(eventAt(application, 'Rejected'), period)).length,
    installed: matched.filter((application) => inPeriod(eventAt(application, 'Installed'), period)).length,
    applicationsCreated: matched.filter((application) => inPeriod(application.createdAt, period)).length,
    audits: scoped.matchedAudits.filter((audit) => inPeriod(audit.createdAt, period)).length,
  };
}

/** Same activity over the previous period of equal length (for % change badges). */
const previousPeriod = (period: PeriodRange): PeriodRange => ({
  ...period,
  from: period.previousFrom,
  to: period.previousTo,
  label: `${period.previousFrom.slice(0, 10)} → ${period.previousTo.slice(0, 10)}`,
});

function moneyFlowOf(scoped: Scoped, period: PeriodRange) {
  const transactions = scoped.matchedTransactions.filter((transaction) => inPeriod(transaction.at, period));
  const kinds = [...new Set(transactions.map((transaction) => transaction.kind))];
  const inflowINR = round(sum(transactions.filter((transaction) => transaction.direction === 'inflow').map((transaction) => transaction.amountINR)));
  const outflowINR = round(sum(transactions.filter((transaction) => transaction.direction === 'outflow').map((transaction) => transaction.amountINR)));
  return {
    inflowINR,
    outflowINR,
    netINR: round(inflowINR - outflowINR),
    byKind: kinds.map((kind) => {
      const list = transactions.filter((transaction) => transaction.kind === kind);
      return {
        kind,
        count: list.length,
        amountINR: round(sum(list.map((transaction) => transaction.amountINR))),
        direction: list[0]?.direction ?? ('none' as const),
      };
    }),
  };
}

// ── Overview ────────────────────────────────────────────────────────────────

export function buildOverview(input: AnalyticsInput): AnalyticsOverview {
  const scoped = scope(input);
  const { matched, period, asOf } = scoped;
  const current = periodCounts(scoped);
  const previous = periodCounts(scoped, previousPeriod(period));

  const live = matched.filter((application) => isLive(application.status));
  const liveKW = round(sum(live.map((application) => application.systemKW)), 1);
  const annualKWh = round(liveKW * DEMO_POLICY.unitPerKW * 12);
  const co2Avoided = co2Tonnes(liveKW);

  const loanApplications = scoped.cohort.filter((application) => application.loanAmount > 0);
  const withRepayment = matched.filter((application) => application.repayment);
  const repaymentTotals = {
    emisDue: sum(withRepayment.map((application) => application.repayment?.emisDue ?? 0)),
    paidOnTime: sum(withRepayment.map((application) => application.repayment?.paidOnTime ?? 0)),
    paidLate: sum(withRepayment.map((application) => application.repayment?.paidLate ?? 0)),
    paid30PlusDpd: sum(withRepayment.map((application) => application.repayment?.paid30PlusDpd ?? 0)),
  };

  // Savings accrue monthly from the month each system was commissioned.
  const monthlySavings = round(sum(live.map((application) => application.estimatedMonthlySavings)));
  const cumulativeSavings = round(
    sum(
      live.map((application) => {
        const commissionedAt = eventAt(application, 'Net Meter Commissioned') ?? application.updatedAt;
        const months = Math.max(1, Math.round((asOf.getTime() - new Date(commissionedAt).getTime()) / (30.4 * DAY_MS)));
        return application.estimatedMonthlySavings * months;
      }),
    ),
  );

  const decided = current.approved + current.rejected;

  return {
    asOf: asOf.toISOString(),
    asOfLabel: asOf.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    period,
    filters: toAppliedFilters({ ...input.filters, from: input.filters.from ?? period.from, to: input.filters.to ?? period.to, preset: period.preset }),
    dataPoints: { applications: matched.length, audits: scoped.matchedAudits.length, transactions: scoped.matchedTransactions.length },
    climate: {
      systemsLive: live.length,
      installedKW: liveKW,
      installedMW: round(liveKW / 1000, 2),
      estAnnualKWh: annualKWh,
      estAnnualMWh: round(annualKWh / 1000, 1),
      co2AvoidedTonnes: co2Avoided,
      equivalentTrees: Math.round((co2Avoided * 1000) / DEMO_KG_CO2_PER_TREE_PER_YEAR),
      change: {
        systemsLive: percentChange(current.liveAdded, previous.liveAdded),
        installedKW: percentChange(current.liveAddedKW, previous.liveAddedKW),
        co2AvoidedTonnes: percentChange(co2Tonnes(current.liveAddedKW), co2Tonnes(previous.liveAddedKW)),
      },
      methodology: {
        label: 'Demo emission factor',
        gridEmissionFactorKgPerKWh: DEMO_GRID_EMISSION_FACTOR,
        kgCO2PerTreePerYear: DEMO_KG_CO2_PER_TREE_PER_YEAR,
        unitPerKW: DEMO_POLICY.unitPerKW,
        note: 'Estimates use demo assumptions, not verified generation data.',
      },
    },
    finance: {
      sanctioned: current.sanctioned,
      disbursed: current.disbursed,
      avgTicketINR: current.disbursed.count > 0 ? round(current.disbursed.amountINR / current.disbursed.count) : 0,
      financedSharePercent: scoped.cohort.length > 0 ? round((loanApplications.length / scoped.cohort.length) * 100, 1) : 0,
      outstandingPrincipalINR: round(sum(withRepayment.map((application) => application.repayment?.outstandingPrincipal ?? 0))),
      repayment: {
        ...repaymentTotals,
        onTimePercent: repaymentTotals.emisDue > 0 ? round((repaymentTotals.paidOnTime / repaymentTotals.emisDue) * 100, 1) : 0,
        dpd30PlusPercent: repaymentTotals.emisDue > 0 ? round((repaymentTotals.paid30PlusDpd / repaymentTotals.emisDue) * 100, 1) : 0,
      },
      change: {
        sanctionedCount: percentChange(current.sanctioned.count, previous.sanctioned.count),
        sanctionedAmountINR: percentChange(current.sanctioned.amountINR, previous.sanctioned.amountINR),
        disbursedCount: percentChange(current.disbursed.count, previous.disbursed.count),
        disbursedAmountINR: percentChange(current.disbursed.amountINR, previous.disbursed.amountINR),
      },
    },
    subsidy: {
      claimed: current.claimed,
      credited: current.credited,
      avgDaysInstallToCredit: installToCreditDays(scoped),
      householdSavings: {
        monthlyINR: monthlySavings,
        cumulativeINR: cumulativeSavings,
        avgMonthlyPerHouseholdINR: live.length > 0 ? round(monthlySavings / live.length) : 0,
      },
      change: {
        claimedAmountINR: percentChange(current.claimed.amountINR, previous.claimed.amountINR),
        creditedAmountINR: percentChange(current.credited.amountINR, previous.credited.amountINR),
        creditedCount: percentChange(current.credited.count, previous.credited.count),
      },
    },
    operations: {
      ...operationsMetrics(scoped, current),
      pendingQueue: matched.filter((application) => application.status === 'Pending Verification').length,
      oldestWaitingHours: oldestWaiting(matched).hours,
      oldestWaitingLabel: oldestWaiting(matched).label,
      slaBreachedCount: matched.filter((application) => application.status === 'Pending Verification' && ageingFor(application, asOf).slaBreached).length,
      approvalRatePercent: decided > 0 ? round((current.approved / decided) * 100, 1) : 0,
      decided: { approved: current.approved, rejected: current.rejected },
      medianTimeToDecisionHours: median(
        matched
          .map((application) => {
            const decision = eventAt(application, 'Approved') ?? eventAt(application, 'Rejected');
            if (!decision || !inPeriod(decision, period)) return null;
            return hoursBetween(application.createdAt, decision);
          })
          .filter((value): value is number => value !== null),
      ),
      medianTimeToInstallHours: median(
        matched
          .map((application) => {
            const installed = eventAt(application, 'Installed');
            if (!installed || !inPeriod(installed, period)) return null;
            return hoursBetween(eventAt(application, 'Approved'), installed);
          })
          .filter((value): value is number => value !== null),
      ),
    },
    moneyFlow: moneyFlowOf(scoped, period),
    pipeline: buildPipeline(matched),
  };
}

/** Median days from commissioning to subsidy credit, over the period's credits. */
function installToCreditDays(scoped: Scoped): number | null {
  const credited = scoped.matchedTransactions.filter(
    (transaction) => transaction.kind === 'Subsidy Credited' && inPeriod(transaction.at, scoped.period),
  );
  return median(
    credited
      .map((transaction) => {
        const application = scoped.matched.find((entry) => entry.id === transaction.applicationId);
        const commissionedAt = application ? eventAt(application, 'Net Meter Commissioned') : undefined;
        if (!commissionedAt) return null;
        return (new Date(transaction.at).getTime() - new Date(commissionedAt).getTime()) / DAY_MS;
      })
      .filter((value): value is number => value !== null && Number.isFinite(value) && value >= 0),
  );
}

function ageingFor(application: Application, asOf: Date) {
  return computeAgeing(
    { status: application.status, createdAt: application.createdAt, updatedAt: application.updatedAt, lastEventAt: lastEventAt(application.timeline) },
    asOf,
  );
}

function oldestWaiting(applications: Application[]) {
  const pending = applications.filter((application) => application.status === 'Pending Verification');
  if (pending.length === 0) return { hours: 0, label: 'none' };
  const oldest = pending.reduce((worst, application) => (application.createdAt < worst.createdAt ? application : worst), pending[0]);
  const ageing = computeAgeing({ status: oldest.status, createdAt: oldest.createdAt, updatedAt: oldest.updatedAt, lastEventAt: lastEventAt(oldest.timeline) });
  return { hours: ageing.waitingHours, label: ageing.waitingLabel };
}

function buildPipeline(matched: Application[]) {
  const byStatus = Object.fromEntries(
    (Object.keys(MILESTONE_ORDER) as ApplicationStatus[]).map((status) => [status, 0]),
  ) as Record<ApplicationStatus, number>;
  matched.forEach((application) => {
    byStatus[application.status] = (byStatus[application.status] ?? 0) + 1;
  });
  return {
    total: matched.length,
    pending: byStatus['Pending Verification'],
    approved: byStatus.Approved,
    scheduled: byStatus['Installation Scheduled'],
    completed: byStatus.Completed,
    rejected: byStatus.Rejected,
    live: matched.filter((application) => isLive(application.status)).length,
    byStatus,
  };
}

/**
 * Applications the period is about: created inside it, or moved forward inside
 * it. Every funnel stage counts from this same set, so the shape can only
 * narrow — never widen — as milestones get harder.
 */
function activeInPeriod(app: Application, period: { from: string; to: string }): boolean {
  return inPeriod(app.createdAt, period) || app.timeline.some((event) => inPeriod(event.at, period));
}

function operationsMetrics(scoped: Scoped, current: PeriodCounts) {
  const cohort = scoped.matched.filter((application) => activeInPeriod(application, scoped.period));
  const reached = (target: ApplicationStatus) =>
    cohort.filter((application) => eventAt(application, target) || application.status === target).length;

  // "Audits" counts the audits in the period plus the audit behind every cohort
  // application (an application always implies an audit was performed), so the
  // funnel can never widen between its first two stages.
  const linkedAuditIds = new Set(cohort.map((application) => application.auditId).filter((id): id is string => Boolean(id)));
  const standaloneAudits = scoped.matchedAudits.filter(
    (audit) => inPeriod(audit.createdAt, scoped.period) && !linkedAuditIds.has(audit.id),
  ).length;
  const impliedAudits = cohort.length - linkedAuditIds.size > 0 ? cohort.filter((application) => !application.auditId).length : 0;
  const auditCount = Math.max(current.audits, linkedAuditIds.size + standaloneAudits + impliedAudits);

  const stages: FunnelStage[] = [
    { key: 'audits', label: 'Audits', value: auditCount, conversionFromPrevious: null },
    { key: 'applications', label: 'Applications', value: cohort.length, conversionFromPrevious: null },
    { key: 'approved', label: 'Approved', value: reached('Approved'), conversionFromPrevious: null },
    { key: 'installed', label: 'Installed', value: reached('Installed'), conversionFromPrevious: null },
    { key: 'commissioned', label: 'Net meter commissioned', value: reached('Net Meter Commissioned'), conversionFromPrevious: null },
    { key: 'subsidy-credited', label: 'Subsidy credited', value: reached('Subsidy Credited'), conversionFromPrevious: null },
  ].map((stage, index, list) => ({
    ...stage,
    conversionFromPrevious: index === 0 || list[index - 1].value === 0 ? null : round((stage.value / list[index - 1].value) * 100, 1),
  }));

  // Financed applications walk the loan steps; upfront ones never do, so the
  // branch is reported on its own rather than inside the linear funnel.
  const financed = cohort.filter((application) => application.loanAmount > 0);
  const disbursed = financed.filter((application) => eventAt(application, 'Loan Disbursed') || application.status === 'Loan Disbursed').length;
  return {
    funnel: stages,
    loanBranch: {
      financedApplications: financed.length,
      disbursed,
      conversionFromFinanced: financed.length > 0 ? round((disbursed / financed.length) * 100, 1) : null,
    },
  };
}

/** Operations funnel exposed on its own for the dashboard funnel widget. */
export function buildFunnel(input: AnalyticsInput): FunnelStage[] {
  const scoped = scope(input);
  return operationsMetrics(scoped, periodCounts(scoped)).funnel;
}

/** Monthly series: activity per month plus cumulative totals across the window. */
export function buildMonthly(input: AnalyticsInput): MonthlyPoint[] {
  const scoped = scope(input);
  const { matched, period } = scoped;
  const firstDay = [...matched.map((application) => application.createdAt.slice(0, 10))].sort()[0];
  const from = period.explicit ? period.from.slice(0, 10) : firstDay ?? period.from.slice(0, 10);
  const keys: string[] = [];
  const cursor = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(period.to);
  while (cursor.getTime() <= end.getTime()) {
    keys.push(monthKey(cursor.toISOString()));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  let cumulativeCO2 = 0;
  let cumulativeLoans = 0;
  return [...new Set(keys)].map((key) => {
    const installed = matched.filter((application) => monthKey(eventAt(application, 'Installed') ?? '') === key);
    const capacityKW = round(sum(installed.map((application) => application.systemKW)), 1);
    const co2 = co2Tonnes(capacityKW);
    const loans = scoped.matchedTransactions.filter((transaction) => transaction.kind === 'Loan Disbursed' && monthKey(transaction.at) === key);
    const loansLakh = round(sum(loans.map((transaction) => transaction.amountINR)) / 100_000, 2);
    const subsidyLakh = round(
      sum(
        scoped.matchedTransactions
          .filter((transaction) => transaction.kind === 'Subsidy Credited' && monthKey(transaction.at) === key)
          .map((transaction) => transaction.amountINR),
      ) / 100_000,
      2,
    );
    cumulativeCO2 = round(cumulativeCO2 + co2, 1);
    cumulativeLoans = round(cumulativeLoans + loansLakh, 2);
    return {
      key,
      month: monthLabel(key),
      installations: installed.length,
      capacityKW,
      co2Tonnes: co2,
      cumulativeCO2,
      loansLakh,
      cumulativeLoansLakh: cumulativeLoans,
      subsidyLakh,
      applications: matched.filter((application) => monthKey(application.createdAt) === key).length,
    };
  });
}

/** Every region is returned, including zeros, so the map/table never collapses. */
export function buildRegional(input: AnalyticsInput): RegionalPoint[] {
  const scoped = scope(input);
  const { matched, period } = scoped;
  return INDIA_REGIONS.map((region) => {
    const applications = matched.filter((application) => application.state === region.name);
    const live = applications.filter((application) => isLive(application.status));
    const capacityKW = round(sum(live.map((application) => application.systemKW)), 1);
    const loans = scoped.matchedTransactions.filter(
      (transaction) => transaction.state === region.name && transaction.kind === 'Loan Disbursed' && inPeriod(transaction.at, period),
    );
    const credited = scoped.matchedTransactions.filter(
      (transaction) => transaction.state === region.name && transaction.kind === 'Subsidy Credited' && inPeriod(transaction.at, period),
    );
    return {
      state: region.name,
      code: region.code,
      type: region.type,
      applications: applications.length,
      systemsLive: live.length,
      capacityKW,
      co2Tonnes: co2Tonnes(capacityKW),
      loansINR: round(sum(loans.map((transaction) => transaction.amountINR))),
      loansLakh: round(sum(loans.map((transaction) => transaction.amountINR)) / 100_000, 2),
      subsidyCreditedINR: round(sum(credited.map((transaction) => transaction.amountINR))),
    };
  });
}

/** Money-flow summary for the ledger page header and charts. */
export function buildTransactionSummary(input: AnalyticsInput): TransactionSummary {
  const scoped = scope(input);
  const transactions = scoped.matchedTransactions.filter((transaction) => inPeriod(transaction.at, scoped.period));
  const months = [...new Set(transactions.map((transaction) => monthKey(transaction.at)))].sort();
  const flow = moneyFlowOf(scoped, scoped.period);
  return {
    totalCount: transactions.length,
    totalINR: round(sum(transactions.map((transaction) => transaction.amountINR))),
    inflowINR: flow.inflowINR,
    outflowINR: flow.outflowINR,
    byKind: flow.byKind,
    byMonth: months.map((key) => {
      const list = transactions.filter((transaction) => monthKey(transaction.at) === key);
      return {
        key,
        label: monthLabel(key),
        inflowINR: round(sum(list.filter((transaction) => transaction.direction === 'inflow').map((transaction) => transaction.amountINR))),
        outflowINR: round(sum(list.filter((transaction) => transaction.direction === 'outflow').map((transaction) => transaction.amountINR))),
        count: list.length,
      };
    }),
  };
}

export { MILESTONE_ORDER };
