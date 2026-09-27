import { DEMO_GRID_EMISSION_FACTOR, DEMO_KG_CO2_PER_TREE_PER_YEAR } from '../config/policyConfig';
import { mockAnalyticsBaseline, mockMonthlyAnalytics, mockRegionalAnalytics } from '../data/mockDatabase';
import type { Application, ApplicationStatus } from '../types';
import { calculateCO2Impact } from './solarCalculator';

const FUNDED_STATUSES: ApplicationStatus[] = ['Approved', 'Installation Scheduled', 'Completed'];

/** Applications created through the app (not seed) that have been funded add to the baseline. */
function fundedNewApplications(applications: Application[]): Application[] {
  return applications.filter((app) => !app.isSeed && FUNDED_STATUSES.includes(app.status));
}

const percentChange = (current: number, previous: number) =>
  previous > 0 ? Math.round(((current - previous) / previous) * 1000) / 10 : 0;

export function buildOverview(applications: Application[]) {
  const funded = fundedNewApplications(applications);
  const addedKW = funded.reduce((sum, app) => sum + app.systemKW, 0);
  const addedLoans = funded.reduce((sum, app) => sum + app.loanAmount, 0);
  const addedCO2 = funded.reduce((sum, app) => sum + calculateCO2Impact(app.systemKW).estimatedCO2OffsetTonnes, 0);

  const base = mockAnalyticsBaseline;
  const households = base.households + funded.length;
  const capacityKW = base.capacityKW + addedKW;
  const co2OffsetTonnes = Math.round((base.co2OffsetTonnes + addedCO2) * 10) / 10;
  const loansDisbursedINR = base.loansDisbursedINR + addedLoans;
  // Annual clean energy implied by the CO₂ figure and the demo emission factor.
  const annualCleanEnergyMWh = Math.round(co2OffsetTonnes / DEMO_GRID_EMISSION_FACTOR);

  const statusCounts = applications.reduce<Record<string, number>>((acc, app) => {
    acc[app.status] = (acc[app.status] ?? 0) + 1;
    return acc;
  }, {});

  return {
    asOf: base.asOf,
    households,
    capacityKW,
    co2OffsetTonnes,
    loansDisbursedINR,
    annualCleanEnergyMWh,
    equivalentTrees: Math.round((co2OffsetTonnes * 1000) / DEMO_KG_CO2_PER_TREE_PER_YEAR),
    change: {
      households: percentChange(households, base.previousPeriod.households),
      capacityKW: percentChange(capacityKW, base.previousPeriod.capacityKW),
      co2OffsetTonnes: percentChange(co2OffsetTonnes, base.previousPeriod.co2OffsetTonnes),
      loansDisbursedINR: percentChange(loansDisbursedINR, base.previousPeriod.loansDisbursedINR),
    },
    pipeline: {
      total: applications.length,
      pending: statusCounts['Pending Verification'] ?? 0,
      approved: statusCounts['Approved'] ?? 0,
      scheduled: statusCounts['Installation Scheduled'] ?? 0,
      completed: statusCounts['Completed'] ?? 0,
      rejected: statusCounts['Rejected'] ?? 0,
    },
    methodology: {
      label: 'Estimated Climate Impact — demo methodology',
      gridEmissionFactorKgPerKWh: DEMO_GRID_EMISSION_FACTOR,
      kgCO2PerTreePerYear: DEMO_KG_CO2_PER_TREE_PER_YEAR,
      note: 'Illustrative factors for demonstration. Actual impact depends on regional grid mix and system performance.',
    },
  };
}

export function buildMonthly(applications: Application[]) {
  const funded = fundedNewApplications(applications);
  const addedKW = funded.reduce((sum, app) => sum + app.systemKW, 0);
  const addedLoansLakh = funded.reduce((sum, app) => sum + app.loanAmount, 0) / 100_000;
  const addedCO2 = funded.reduce((sum, app) => sum + calculateCO2Impact(app.systemKW).estimatedCO2OffsetTonnes, 0);

  let cumulativeCO2 = 0;
  let cumulativeLoans = 0;
  return mockMonthlyAnalytics.map((row, index, rows) => {
    const isCurrent = index === rows.length - 1;
    const installations = row.installations + (isCurrent ? funded.length : 0);
    const co2Tonnes = row.co2Tonnes + (isCurrent ? addedCO2 : 0);
    const loansLakh = row.loansLakh + (isCurrent ? addedLoansLakh : 0);
    cumulativeCO2 += co2Tonnes;
    cumulativeLoans += loansLakh;
    return {
      month: row.month,
      installations,
      capacityKW: row.capacityKW + (isCurrent ? addedKW : 0),
      co2Tonnes: Math.round(co2Tonnes * 10) / 10,
      cumulativeCO2: Math.round(cumulativeCO2 * 10) / 10,
      loansLakh: Math.round(loansLakh * 100) / 100,
      cumulativeLoansLakh: Math.round(cumulativeLoans * 100) / 100,
    };
  });
}

export function buildRegional(applications: Application[]) {
  const funded = fundedNewApplications(applications);
  return mockRegionalAnalytics.map((row) => {
    const inState = funded.filter((app) => app.state === row.state);
    return {
      ...row,
      households: row.households + inState.length,
      capacityKW: row.capacityKW + inState.reduce((sum, app) => sum + app.systemKW, 0),
      loansLakh: Math.round((row.loansLakh + inState.reduce((sum, app) => sum + app.loanAmount, 0) / 100_000) * 100) / 100,
    };
  });
}
