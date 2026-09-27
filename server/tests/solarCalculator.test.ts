import { describe, expect, it } from 'vitest';
import {
  calculateCO2Impact,
  calculateEMI,
  calculateLoanSummary,
  calculateMarketCost,
  calculateMonthlySavings,
  calculateNetCost,
  calculateSolarRecommendation,
  calculateSolarRequirement,
  calculateSubsidy,
  getAffordability,
} from '../src/services/solarCalculator';

describe('calculateSolarRequirement', () => {
  it('recommends ~3 kW for 350 units/month', () => {
    const result = calculateSolarRequirement(350);
    expect(result.rawKW).toBeCloseTo(2.92, 2);
    expect(result.recommendedKW).toBe(3);
  });

  it('returns 0 kW for 0 or invalid units (no NaN)', () => {
    expect(calculateSolarRequirement(0).recommendedKW).toBe(0);
    expect(calculateSolarRequirement(Number.NaN).recommendedKW).toBe(0);
    expect(calculateSolarRequirement(-50).recommendedKW).toBe(0);
  });

  it('never recommends less than 1 kW for small positive usage', () => {
    expect(calculateSolarRequirement(40).recommendedKW).toBe(1);
  });

  it('caps extremely high consumption', () => {
    const result = calculateSolarRequirement(50000);
    expect(result.recommendedKW).toBe(10);
    expect(result.capped).toBe(true);
  });
});

describe('calculateSubsidy', () => {
  it('applies central + UP state top-up for 3 kW', () => {
    expect(calculateSubsidy(3, 'Uttar Pradesh')).toMatchObject({ centralSubsidy: 78000, stateSubsidy: 30000, totalSubsidy: 108000 });
  });

  it('matches "Tamil Nadu" to the TamilNadu policy key', () => {
    expect(calculateSubsidy(2, 'Tamil Nadu').stateSubsidy).toBe(15000);
  });

  it('gives no state top-up for unsupported states', () => {
    const result = calculateSubsidy(3, 'Atlantis');
    expect(result.stateSubsidy).toBe(0);
    expect(result.stateSupported).toBe(false);
  });

  it('caps central subsidy at the largest tier and never exceeds system cost', () => {
    expect(calculateSubsidy(5, 'Gujarat').centralSubsidy).toBe(78000);
    const small = calculateSubsidy(1, 'Uttar Pradesh');
    expect(small.totalSubsidy).toBeLessThanOrEqual(calculateMarketCost(1));
  });
});

describe('full recommendation (demo flow)', () => {
  it('produces the demo breakdown for 350 units in UP', () => {
    const rec = calculateSolarRecommendation(350, 'Uttar Pradesh', 2800);
    expect(rec.recommendedKW).toBe(3);
    expect(rec.marketCost).toBe(165000);
    expect(rec.totalSubsidy).toBe(108000);
    expect(rec.netCost).toBe(57000);
    expect(rec.estimatedMonthlySavings).toBe(2800);
  });

  it('net cost never goes negative', () => {
    expect(calculateNetCost(1000, 5000)).toBe(0);
  });
});

describe('calculateEMI', () => {
  it('₹57,000 at 7.5% for 36 months ≈ ₹1,770', () => {
    const emi = calculateEMI(57000, 7.5, 36);
    expect(Math.abs(emi - 1770)).toBeLessThan(10);
  });

  it('handles zero interest, zero principal and zero tenure', () => {
    expect(calculateEMI(36000, 0, 36)).toBe(1000);
    expect(calculateEMI(0, 7.5, 36)).toBe(0);
    expect(calculateEMI(57000, 7.5, 0)).toBe(0);
  });

  it('summarises total repayment and interest', () => {
    const summary = calculateLoanSummary(57000, 7.5, 36);
    expect(summary.totalRepayment).toBeGreaterThan(57000);
    expect(summary.totalInterest).toBe(summary.totalRepayment - 57000);
  });
});

describe('calculateMonthlySavings', () => {
  it('₹2,800 bill minus EMI ≈ ₹1,030 monthly difference', () => {
    const savings = calculateMonthlySavings(350, 2800, 360);
    const emi = Math.round(calculateEMI(57000, 7.5, 36));
    expect(savings).toBe(2800);
    expect(Math.abs(savings - emi - 1030)).toBeLessThan(10);
  });

  it('estimates bill from units when bill is missing', () => {
    expect(calculateMonthlySavings(100, undefined, 120)).toBe(800);
  });

  it('prorates savings when generation covers only part of usage', () => {
    expect(calculateMonthlySavings(400, 4000, 200)).toBe(2000);
  });
});

describe('climate impact & affordability', () => {
  it('estimates annual energy and CO₂ with the demo factor', () => {
    const impact = calculateCO2Impact(3, 360);
    expect(impact.annualCleanEnergy).toBe(4320);
    expect(impact.estimatedCO2OffsetTonnes).toBeCloseTo(3.02, 2);
  });

  it('classifies affordability relative to the current bill', () => {
    expect(getAffordability(1773, 2800)).toBe('comfortable');
    expect(getAffordability(2500, 2800)).toBe('moderate');
    expect(getAffordability(3500, 2800)).toBe('high');
    expect(getAffordability(0, 0)).toBe('comfortable');
  });
});
