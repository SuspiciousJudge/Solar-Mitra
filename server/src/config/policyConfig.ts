/**
 * DEMO POLICY ASSUMPTIONS — FOR HACKATHON SIMULATION ONLY.
 *
 * These values are configurable assumptions used to illustrate the product.
 * They are NOT official government policy. Actual subsidy eligibility and
 * amounts must be verified against current official guidelines.
 *
 * Keep this file in sync with client/src/utils/policyConfig.ts.
 */
export const DEMO_POLICY = {
  /** Assumed average monthly generation per installed kW (kWh). */
  unitPerKW: 120,
  /** Assumed installed market cost by system size (₹). */
  baseSystemCost: {
    1: 60000,
    2: 110000,
    3: 165000,
  } as Record<number, number>,
  /** Assumed central subsidy by system size (₹). Capped at the 3 kW value. */
  centralSubsidy: {
    1: 30000,
    2: 60000,
    3: 78000,
  } as Record<number, number>,
  /** Assumed state top-up (₹). States not listed receive no top-up. */
  stateTopUp: {
    'Uttar Pradesh': 30000,
    Gujarat: 20000,
    TamilNadu: 15000,
  } as Record<string, number>,
  /** Assumed cost for every kW above 3 kW (₹). */
  additionalCostPerKW: 50000,
  /** Largest residential system the calculator will recommend (kW). */
  maxRecommendedKW: 10,
  /** Assumed tariff used only when a bill amount is missing (₹/kWh). */
  fallbackTariffPerUnit: 8,
};

export const DEMO_FINANCING = {
  annualInterestRate: 7.5,
  tenureMonths: 36,
};

/** Demo grid emission factor (kg CO₂ per kWh). Illustrative, not universally applicable. */
export const DEMO_GRID_EMISSION_FACTOR = 0.7;

/** Demo estimate of CO₂ absorbed by one mature tree per year (kg). Illustrative only. */
export const DEMO_KG_CO2_PER_TREE_PER_YEAR = 21;

export const SUPPORTED_STATES = [
  'Uttar Pradesh',
  'Gujarat',
  'Tamil Nadu',
  'Rajasthan',
  'Maharashtra',
  'Other',
] as const;
