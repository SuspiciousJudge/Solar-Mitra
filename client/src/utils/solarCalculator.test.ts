import { describe, expect, it } from 'vitest';
import {
  calculateCO2Impact,
  calculateEMI,
  calculateMonthlySavings,
  calculateSolarRecommendation,
  calculateSolarRequirement,
  calculateSubsidy,
  getAffordability,
} from './solarCalculator';

describe('client solar calculator (mirrors server)', () => {
  it('350 units → 3 kW', () => {
    expect(calculateSolarRequirement(350).recommendedKW).toBe(3);
  });

  it('UP 3 kW subsidy = ₹1,08,000 and net cost ₹57,000', () => {
    expect(calculateSubsidy(3, 'Uttar Pradesh').totalSubsidy).toBe(108000);
    expect(calculateSolarRecommendation(350, 'Uttar Pradesh', 2800).netCost).toBe(57000);
  });

  it('EMI for ₹57,000 @ 7.5% / 36 months ≈ ₹1,770', () => {
    expect(Math.abs(calculateEMI(57000, 7.5, 36) - 1770)).toBeLessThan(10);
  });

  it('monthly difference ≈ ₹1,030', () => {
    const savings = calculateMonthlySavings(350, 2800, 360);
    expect(Math.abs(savings - Math.round(calculateEMI(57000, 7.5, 36)) - 1030)).toBeLessThan(10);
  });

  it('never returns NaN for bad inputs', () => {
    const rec = calculateSolarRecommendation(Number.NaN, '', Number.NaN);
    Object.values(rec).forEach((value) => {
      if (typeof value === 'number') expect(Number.isFinite(value)).toBe(true);
    });
    expect(calculateCO2Impact(0).annualCleanEnergy).toBe(0);
    expect(getAffordability(Number.POSITIVE_INFINITY, 2800)).toBe('comfortable');
  });
});
