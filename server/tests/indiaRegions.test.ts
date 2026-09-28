import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { INDIA_REGIONS, INDIA_STATES, INDIA_UNION_TERRITORIES, districtsForRegion, findRegion, isSpecialCategoryRegion } from '../src/data/indiaRegions';

describe('india regions dataset', () => {
  it('covers all 28 states and 8 union territories', () => {
    expect(INDIA_REGIONS).toHaveLength(36);
    expect(INDIA_STATES).toHaveLength(28);
    expect(INDIA_UNION_TERRITORIES).toHaveLength(8);
  });

  it('has unique codes and names', () => {
    expect(new Set(INDIA_REGIONS.map((region) => region.code)).size).toBe(36);
    expect(new Set(INDIA_REGIONS.map((region) => region.name)).size).toBe(36);
  });

  it('gives every region discoms and districts', () => {
    INDIA_REGIONS.forEach((region) => {
      expect(region.discoms.length).toBeGreaterThan(0);
      expect(region.districts.length).toBeGreaterThan(0);
    });
  });

  it('flags the special-category states and UTs used for higher central CFA', () => {
    const special = INDIA_REGIONS.filter((region) => region.isSpecialCategory).map((region) => region.code).sort();
    expect(special).toEqual(['AN', 'AR', 'AS', 'HP', 'JK', 'LA', 'LD', 'ML', 'MN', 'MZ', 'NL', 'SK', 'TR', 'UK']);
    expect(isSpecialCategoryRegion('Sikkim')).toBe(true);
    expect(isSpecialCategoryRegion('Gujarat')).toBe(false);
  });

  it('resolves names, codes and district lists', () => {
    expect(findRegion('uttar pradesh')?.code).toBe('UP');
    expect(findRegion('TN')?.name).toBe('Tamil Nadu');
    expect(findRegion('Atlantis')).toBeUndefined();
    expect(districtsForRegion('Sikkim')).toContain('Gangtok');
  });

  it('keeps the client mirror byte-identical', () => {
    const server = readFileSync(path.join(__dirname, '../src/data/indiaRegions.ts'), 'utf8');
    const client = readFileSync(path.join(__dirname, '../../client/src/data/indiaRegions.ts'), 'utf8');
    expect(client).toBe(server);
  });
});
