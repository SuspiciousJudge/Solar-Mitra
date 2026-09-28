import { describe, expect, it } from 'vitest';
import { DEMO_POLICY } from '../src/config/policyConfig';
import {
  SCHEME_CATALOGUE_VERSION,
  SCHEME_DISCLAIMER,
  SUBSIDY_SCHEMES,
  defaultSchemeIdsForState,
  describeSchemeCalc,
  getScheme,
  listSchemes,
  stackableSchemesForState,
} from '../src/config/subsidySchemes';
import { calculateSubsidy } from '../src/services/solarCalculator';
import { INDIA_REGIONS } from '../src/data/indiaRegions';

const ids = new Set(SUBSIDY_SCHEMES.map((scheme) => scheme.id));

describe('subsidy scheme catalogue', () => {
  it('is versioned, labelled and complete', () => {
    expect(SCHEME_CATALOGUE_VERSION).toMatch(/^\d{4}\.\d{2}-demo\.\d+$/);
    expect(SCHEME_DISCLAIMER).toBe('Demo policy assumption — verify against the official portal');
    SUBSIDY_SCHEMES.forEach((scheme) => {
      expect(scheme.isDemoAssumption).toBe(true);
      expect(scheme.lastVerified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(scheme.eligibility.length).toBeGreaterThan(0);
      expect(scheme.disbursementRoute.length).toBeGreaterThan(10);
      expect(scheme.officialUrl).toMatch(/^https?:\/\//);
    });
  });

  it('has unique ids and only references real schemes', () => {
    expect(ids.size).toBe(SUBSIDY_SCHEMES.length);
    SUBSIDY_SCHEMES.forEach((scheme) => {
      scheme.stackableWith.forEach((id) => {
        expect(ids.has(id), `${scheme.id} stacks with unknown scheme ${id}`).toBe(true);
      });
    });
  });

  it('covers every state scheme with a valid state name', () => {
    const names = new Set(INDIA_REGIONS.map((region) => region.name));
    listSchemes({ level: 'state' })
      .filter((scheme) => scheme.state)
      .forEach((scheme) => expect(names.has(scheme.state as string)).toBe(true));
  });

  it('matches the calculator for the residential rooftop scheme', () => {
    const rooftop = getScheme('pm-surya-ghar-rts');
    expect(rooftop).toBeDefined();
    expect(rooftop?.calc).toMatchObject({ type: 'per_kw_slab', capINR: 78000 });

    // Central CFA per the catalogue slabs: 2 kW × ₹30,000 + the 3rd kW at ₹18,000, capped at ₹78,000.
    const centralFromCatalogue = (kw: number): number => {
      let total = 0;
      let previous = 0;
      rooftop?.calc.type === 'per_kw_slab' &&
        rooftop.calc.slabs.forEach((slab) => {
          total += Math.max(0, Math.min(kw, slab.uptoKW) - previous) * slab.perKW;
          previous = slab.uptoKW;
        });
      return Math.min(total, rooftop?.calc.type === 'per_kw_slab' ? rooftop.calc.capINR ?? Infinity : Infinity);
    };

    [1, 2, 3, 5].forEach((kw) => {
      const calculator = calculateSubsidy(kw, 'Kerala'); // Kerala has no state top-up in the demo policy
      expect(centralFromCatalogue(kw)).toBe(calculator.centralSubsidy);
    });
  });

  it('derives state top-ups from the demo policy config (no duplicated numbers)', () => {
    expect(getScheme('up-rts-topup')?.calc).toMatchObject({ type: 'flat', amountINR: DEMO_POLICY.stateTopUp['Uttar Pradesh'] });
    expect(getScheme('gj-rts-topup')?.calc).toMatchObject({ type: 'flat', amountINR: DEMO_POLICY.stateTopUp.Gujarat });
    expect(getScheme('tn-rts-topup')?.calc).toMatchObject({ type: 'flat', amountINR: DEMO_POLICY.stateTopUp.TamilNadu });
  });

  it('stacks central + state schemes for the states that have a top-up', () => {
    expect(stackableSchemesForState('Uttar Pradesh').map((scheme) => scheme.id)).toEqual(['pm-surya-ghar-rts', 'up-rts-topup']);
    expect(stackableSchemesForState('Kerala').map((scheme) => scheme.id)).toEqual(['pm-surya-ghar-rts']);
  });

  it('defaults applications to the central scheme plus any state top-up', () => {
    expect(defaultSchemeIdsForState('Uttar Pradesh')).toEqual(['pm-surya-ghar-rts', 'up-rts-topup']);
    expect(defaultSchemeIdsForState('Delhi')).toEqual(['pm-surya-ghar-rts']);
  });

  it('describes each calc type for the UI', () => {
    expect(describeSchemeCalc({ type: 'flat', amountINR: 0 })).toContain('Programme-level');
    expect(describeSchemeCalc({ type: 'flat', amountINR: 50000 })).toContain('50,000');
    expect(describeSchemeCalc({ type: 'percent_of_cost', percent: 30 })).toBe('30% of eligible system cost');
    expect(describeSchemeCalc({ type: 'per_kw_slab', slabs: [{ uptoKW: 2, perKW: 30000 }], capINR: 78000 })).toContain('capped at ₹78,000');
  });

  it('keeps programme-level schemes out of the per-household money maths', () => {
    ['pli-solar-modules', 'solar-parks', 'cpsu-phase-ii', 'almm'].forEach((id) => {
      const scheme = getScheme(id);
      expect(scheme?.supportType).not.toBe('consumer_subsidy');
      expect(scheme?.displayAmount).toBeTruthy();
    });
  });
});
