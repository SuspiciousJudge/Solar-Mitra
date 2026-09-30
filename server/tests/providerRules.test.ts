import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  GSTIN_REGEX,
  IFSC_REGEX,
  MOBILE_REGEX,
  PAN_REGEX,
  PIN_REGEX,
  UDYAM_REGEX,
  canTransitionProvider,
  collectSelfRiskFlags,
  computeCompleteness,
  gstinChecksumChar,
  isValidGstinChecksum,
  isValidIfsc,
  isValidMobile,
  isValidPan,
  isValidPin,
  isValidUdyam,
  licenceExpiryFlag,
  makeGstin,
  namesLooselyMatch,
  normalizeMobile,
  panFourthMatchesBusiness,
  panFromGstin,
  passwordIssues,
} from '../src/validators/providerRules';

describe('provider validation rules', () => {
  it('keeps the client mirror byte-identical', () => {
    const server = readFileSync(path.join(__dirname, '../src/validators/providerRules.ts'), 'utf8');
    const client = readFileSync(path.join(__dirname, '../../client/src/utils/providerRules.ts'), 'utf8');
    expect(client).toBe(server);
  });

  it('validates GSTIN format and checksum', () => {
    const gstin = makeGstin('09', 'AARPA1234Q');
    expect(GSTIN_REGEX.test(gstin)).toBe(true);
    expect(isValidGstinChecksum(gstin)).toBe(true);
    expect(panFromGstin(gstin)).toBe('AARPA1234Q');
    expect(gstinChecksumChar(gstin.slice(0, 14))).toBe(gstin[14]);
    expect(isValidGstinChecksum('09AARCP1234Q1Z0')).toBe(false);
  });

  it('validates PAN format and 4th-character constitution', () => {
    expect(isValidPan('AARPA1234Q')).toBe(true);
    expect(PAN_REGEX.test('AARC1234Q')).toBe(false);
    expect(panFourthMatchesBusiness('AARPA1234Q', 'Proprietorship')).toBe(true);
    expect(panFourthMatchesBusiness('AARPA1234Q', 'Private Limited')).toBe(false);
    expect(panFourthMatchesBusiness('AABCA3456S', 'Private Limited')).toBe(true);
    expect(panFourthMatchesBusiness('AABFA2345R', 'LLP')).toBe(true);
  });

  it('matches GSTIN embedded PAN', () => {
    const gstin = makeGstin('24', 'AABFA2345R');
    expect(panFromGstin(gstin)).toBe('AABFA2345R');
    expect(panFromGstin(gstin) === 'AARPA1234Q').toBe(false);
  });

  it('validates IFSC, PIN, Udyam and mobile', () => {
    expect(isValidIfsc('SBIN0000691')).toBe(true);
    expect(IFSC_REGEX.test('SBIN10691')).toBe(false);
    expect(isValidPin('208001')).toBe(true);
    expect(PIN_REGEX.test('012345')).toBe(false);
    expect(isValidUdyam('UDYAM-UP-01-0000001')).toBe(true);
    expect(UDYAM_REGEX.test('UDYAM-U-01-1')).toBe(false);
    expect(isValidMobile('9876543210')).toBe(true);
    expect(MOBILE_REGEX.test('5876543210')).toBe(false);
    expect(normalizeMobile('+91 98765-43210')).toBe('9876543210');
  });

  it('enforces password rules', () => {
    expect(passwordIssues('short')).toBeTruthy();
    expect(passwordIssues('longenough')).toMatch(/number/i);
    expect(passwordIssues('12345678')).toMatch(/letter/i);
    expect(passwordIssues('demo1234')).toBeUndefined();
  });

  it('flags licence expiry windows', () => {
    expect(licenceExpiryFlag('2020-01-01', new Date('2026-09-30'))).toBe('expired');
    expect(licenceExpiryFlag('2026-10-20', new Date('2026-09-30'))).toBe('expiring');
    expect(licenceExpiryFlag('2027-12-31', new Date('2026-09-30'))).toBeUndefined();
  });

  it('fuzzy-matches bank holder names', () => {
    expect(namesLooselyMatch('Surya Shakti Solars Pvt Ltd', 'Surya Shakti Solars')).toBe(true);
    expect(namesLooselyMatch('Unrelated Holder Name', 'Kutch Sun Partnership')).toBe(false);
  });

  it('computes completeness and self risk flags', () => {
    const flags = collectSelfRiskFlags({
      gstin: makeGstin('24', 'AARPA8901X'),
      pan: 'AARPA8901X',
      registeredState: 'Uttar Pradesh',
      businessType: 'Proprietorship',
      legalName: 'Ganga Plains Energy',
      accountHolderName: 'Ganga Plains Energy',
      yearsInBusiness: 6,
      yearsExperience: 5,
      totalInstallations: 40,
      engineers: 1,
      installers: 3,
      licenceValidTill: '2027-09-30',
      notBlacklisted: true,
    });
    expect(flags).toContain('gstin_state_mismatch');
    const score = computeCompleteness({
      business: {},
      statutory: {},
      credentials: {},
      experience: {},
      serviceArea: {},
      bank: {},
      contact: {},
      declarations: {},
      documentTypes: [],
    });
    expect(score.score).toBe(0);
    expect(score.missing.length).toBeGreaterThan(5);
  });

  it('rejects illegal status transitions', () => {
    expect(canTransitionProvider('Draft', 'Approved').allowed).toBe(false);
    expect(canTransitionProvider('Draft', 'Submitted').allowed).toBe(true);
    expect(canTransitionProvider('Rejected', 'Draft').allowed).toBe(false);
    expect(canTransitionProvider('Approved', 'Suspended').allowed).toBe(true);
  });
});
