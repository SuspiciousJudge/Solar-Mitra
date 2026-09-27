/**
 * Pure, unit-testable solar & finance calculations.
 * Mirrors server/src/services/solarCalculator.ts — keep both in sync.
 * The server recomputes every figure before storing an application.
 */
import {
  DEMO_GRID_EMISSION_FACTOR,
  DEMO_KG_CO2_PER_TREE_PER_YEAR,
  DEMO_POLICY,
} from './policyConfig';

export type Policy = typeof DEMO_POLICY;

export interface SolarRequirement {
  rawKW: number;
  recommendedKW: number;
  capped: boolean;
}

export interface SubsidyResult {
  centralSubsidy: number;
  stateSubsidy: number;
  totalSubsidy: number;
  stateSupported: boolean;
}

export interface SolarRecommendation extends SubsidyResult {
  recommendedKW: number;
  marketCost: number;
  netCost: number;
  estimatedMonthlyGeneration: number;
  estimatedMonthlySavings: number;
  capped: boolean;
}

export interface EmiResult {
  emi: number;
  totalRepayment: number;
  totalInterest: number;
}

export interface CO2Impact {
  annualCleanEnergy: number;
  estimatedCO2OffsetTonnes: number;
  equivalentTrees: number;
}

export type Affordability = 'comfortable' | 'moderate' | 'high';

const safe = (value: number): number => (Number.isFinite(value) && value > 0 ? value : 0);

/** Normalises "Tamil Nadu" / "TamilNadu" / "tamil nadu" to a policy key. */
export function normaliseStateKey(state: string): string {
  return state.replace(/\s+/g, '').toLowerCase();
}

export function calculateSolarRequirement(monthlyUnits: number, policy: Policy = DEMO_POLICY): SolarRequirement {
  const units = safe(monthlyUnits);
  if (units === 0) return { rawKW: 0, recommendedKW: 0, capped: false };
  const rawKW = units / policy.unitPerKW;
  const rounded = Math.max(1, Math.round(rawKW));
  const recommendedKW = Math.min(rounded, policy.maxRecommendedKW);
  return { rawKW: Math.round(rawKW * 100) / 100, recommendedKW, capped: rounded > policy.maxRecommendedKW };
}

export function calculateMarketCost(systemKW: number, policy: Policy = DEMO_POLICY): number {
  const kw = Math.floor(safe(systemKW));
  if (kw === 0) return 0;
  if (policy.baseSystemCost[kw] !== undefined) return policy.baseSystemCost[kw];
  const largestTier = Math.max(...Object.keys(policy.baseSystemCost).map(Number));
  return policy.baseSystemCost[largestTier] + (kw - largestTier) * policy.additionalCostPerKW;
}

export function getStateTopUp(state: string, policy: Policy = DEMO_POLICY): { amount: number; supported: boolean } {
  const key = normaliseStateKey(state ?? '');
  const match = Object.entries(policy.stateTopUp).find(([name]) => normaliseStateKey(name) === key);
  return match ? { amount: match[1], supported: true } : { amount: 0, supported: false };
}

export function calculateSubsidy(systemKW: number, state: string, marketCost?: number, policy: Policy = DEMO_POLICY): SubsidyResult {
  const kw = Math.floor(safe(systemKW));
  if (kw === 0) return { centralSubsidy: 0, stateSubsidy: 0, totalSubsidy: 0, stateSupported: getStateTopUp(state, policy).supported };
  const tiers = Object.keys(policy.centralSubsidy).map(Number);
  const tier = Math.min(kw, Math.max(...tiers));
  const centralSubsidy = policy.centralSubsidy[tier] ?? 0;
  const topUp = getStateTopUp(state, policy);
  let total = centralSubsidy + topUp.amount;
  // A subsidy should never exceed the cost of the system itself.
  const cost = marketCost ?? calculateMarketCost(kw, policy);
  const stateSubsidy = total > cost ? Math.max(0, cost - centralSubsidy) : topUp.amount;
  total = Math.min(total, cost);
  return { centralSubsidy: Math.min(centralSubsidy, cost), stateSubsidy, totalSubsidy: total, stateSupported: topUp.supported };
}

export function calculateNetCost(marketCost: number, totalSubsidy: number): number {
  return Math.max(0, Math.round(safe(marketCost) - safe(totalSubsidy)));
}

export function calculateMonthlyGeneration(systemKW: number, policy: Policy = DEMO_POLICY): number {
  return Math.round(safe(systemKW) * policy.unitPerKW);
}

/**
 * Savings = share of consumption covered by solar × current bill.
 * When the bill is missing, it is estimated with a demo fallback tariff.
 */
export function calculateMonthlySavings(
  monthlyUnits: number,
  monthlyBill: number | undefined,
  monthlyGeneration: number,
  policy: Policy = DEMO_POLICY,
): number {
  const units = safe(monthlyUnits);
  if (units === 0) return 0;
  const bill = safe(monthlyBill ?? 0) || units * policy.fallbackTariffPerUnit;
  const coverage = Math.min(1, safe(monthlyGeneration) / units);
  return Math.round(bill * coverage);
}

export function calculateSolarRecommendation(
  monthlyUnits: number,
  state: string,
  monthlyBill?: number,
  policy: Policy = DEMO_POLICY,
): SolarRecommendation {
  const { recommendedKW, capped } = calculateSolarRequirement(monthlyUnits, policy);
  const marketCost = calculateMarketCost(recommendedKW, policy);
  const subsidy = calculateSubsidy(recommendedKW, state, marketCost, policy);
  const estimatedMonthlyGeneration = calculateMonthlyGeneration(recommendedKW, policy);
  return {
    recommendedKW,
    capped,
    marketCost,
    ...subsidy,
    netCost: calculateNetCost(marketCost, subsidy.totalSubsidy),
    estimatedMonthlyGeneration,
    estimatedMonthlySavings: calculateMonthlySavings(monthlyUnits, monthlyBill, estimatedMonthlyGeneration, policy),
  };
}

/** Standard reducing-balance EMI: P·r·(1+r)^n / ((1+r)^n − 1). Returns the unrounded value. */
export function calculateEMI(principal: number, annualInterestRate: number, months: number): number {
  const p = safe(principal);
  const n = Math.floor(safe(months));
  if (p === 0 || n === 0) return 0;
  const r = safe(annualInterestRate) / 12 / 100;
  if (r === 0) return p / n;
  const growth = Math.pow(1 + r, n);
  const emi = (p * r * growth) / (growth - 1);
  return Number.isFinite(emi) ? emi : 0;
}

export function calculateLoanSummary(principal: number, annualInterestRate: number, months: number): EmiResult {
  const exactEmi = calculateEMI(principal, annualInterestRate, months);
  const n = Math.floor(safe(months));
  const emi = Math.round(exactEmi);
  const totalRepayment = Math.round(exactEmi * n);
  return { emi, totalRepayment, totalInterest: Math.max(0, totalRepayment - Math.round(safe(principal))) };
}

export function calculateCO2Impact(
  systemKW: number,
  estimatedMonthlyGeneration?: number,
  emissionFactor: number = DEMO_GRID_EMISSION_FACTOR,
  policy: Policy = DEMO_POLICY,
): CO2Impact {
  const monthly = estimatedMonthlyGeneration ?? calculateMonthlyGeneration(systemKW, policy);
  const annualCleanEnergy = Math.round(safe(monthly) * 12);
  const kgCO2 = annualCleanEnergy * emissionFactor;
  return {
    annualCleanEnergy,
    estimatedCO2OffsetTonnes: Math.round((kgCO2 / 1000) * 100) / 100,
    equivalentTrees: Math.round(kgCO2 / DEMO_KG_CO2_PER_TREE_PER_YEAR),
  };
}

export function getAffordability(emi: number, currentMonthlyBill: number): Affordability {
  const bill = safe(currentMonthlyBill);
  if (bill === 0) return safe(emi) === 0 ? 'comfortable' : 'high';
  const ratio = safe(emi) / bill;
  if (ratio <= 0.7) return 'comfortable';
  if (ratio <= 1) return 'moderate';
  return 'high';
}
