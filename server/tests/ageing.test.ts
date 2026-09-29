import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { SLA_HOURS, computeAgeing, formatWaiting, lastEventAt } from '../src/utils/ageing';

describe('ageing & SLA', () => {
  it('renders "3d 4h" style waiting times', () => {
    expect(formatWaiting(76)).toBe('3d 4h');
    expect(formatWaiting(5.33)).toBe('5h 19m');
    expect(formatWaiting(0.5)).toBe('30m');
    expect(formatWaiting(0)).toBe('just now');
    expect(formatWaiting(Number.NaN)).toBe('just now');
  });

  it('flags a pending verification older than the SLA', () => {
    const ageing = computeAgeing(
      { status: 'Pending Verification', createdAt: '2026-09-24T10:00:00.000Z', lastEventAt: '2026-09-24T10:00:00.000Z' },
      new Date('2026-09-27T14:00:00.000Z'),
    );
    expect(ageing).toMatchObject({ waitingHours: 76, waitingLabel: '3d 4h', slaBreached: true, slaHours: SLA_HOURS });
  });

  it('does not flag non-pending files even when they are old', () => {
    expect(computeAgeing({ status: 'Approved', createdAt: '2026-09-01T00:00:00.000Z' }, new Date('2026-09-27T00:00:00.000Z')).slaBreached).toBe(false);
  });

  it('uses the newest timeline entry', () => {
    expect(lastEventAt([{ at: '2026-09-01T00:00:00.000Z' }, { at: '2026-09-20T00:00:00.000Z' }, { at: '2026-09-10T00:00:00.000Z' }])).toBe('2026-09-20T00:00:00.000Z');
    expect(lastEventAt([])).toBeUndefined();
  });

  it('keeps the client mirrors byte-identical', () => {
    ['ageing.ts', 'statusFlow.ts'].forEach((file) => {
      const server = readFileSync(path.join(__dirname, '../src', file === 'ageing.ts' ? 'utils/ageing.ts' : 'config/statusFlow.ts'), 'utf8');
      const client = readFileSync(path.join(__dirname, '../../client/src', file === 'ageing.ts' ? 'utils/ageing.ts' : 'utils/statusFlow.ts'), 'utf8');
      expect(client).toBe(server);
    });
  });
});
