import { describe, expect, it } from 'vitest';
import {
  APPLICATION_STATUSES,
  MILESTONE_ORDER,
  REJECTION_REASONS,
  STATUS_FLOW,
  TRANSITION_ROLES,
  availableTransitions,
  canTransition,
  hasReached,
  isLive,
  milestoneAt,
  nextStatuses,
} from '../src/config/statusFlow';

describe('status flow config', () => {
  it('defines the full operator lifecycle', () => {
    expect(APPLICATION_STATUSES).toEqual([
      'Pending Verification',
      'Approved',
      'Rejected',
      'Loan Sanctioned',
      'Loan Disbursed',
      'Installation Scheduled',
      'Installed',
      'Net Meter Commissioned',
      'Subsidy Claimed',
      'Subsidy Credited',
      'Completed',
    ]);
  });

  it('only allows approved next steps', () => {
    expect(STATUS_FLOW['Pending Verification']).toEqual(['Approved', 'Rejected']);
    expect(STATUS_FLOW['Net Meter Commissioned']).toEqual(['Subsidy Claimed']);
    expect(STATUS_FLOW.Completed).toEqual([]);
    expect(STATUS_FLOW.Rejected).toEqual([]);
  });

  it('makes financed applications walk the loan steps', () => {
    expect(nextStatuses({ status: 'Approved', loanAmount: 57000 })).toEqual(['Loan Sanctioned']);
    expect(nextStatuses({ status: 'Loan Sanctioned', loanAmount: 57000 })).toEqual(['Loan Disbursed']);
    expect(canTransition('Approved', 'Installation Scheduled', { status: 'Approved', loanAmount: 57000, role: 'admin' })).toMatchObject({
      allowed: false,
    });
  });

  it('lets upfront applications skip the loan steps', () => {
    expect(nextStatuses({ status: 'Approved', loanAmount: 0 })).toEqual(['Installation Scheduled']);
    expect(canTransition('Approved', 'Loan Sanctioned', { status: 'Approved', loanAmount: 0, role: 'admin' })).toMatchObject({ allowed: false });
  });

  it('never allows jumping over a milestone', () => {
    const verdict = canTransition('Approved', 'Completed', { status: 'Approved', loanAmount: 0, role: 'admin' });
    expect(verdict.allowed).toBe(false);
    expect(verdict.reason).toContain('Cannot move from');
  });

  it('gates money movements to finance and admins', () => {
    expect(TRANSITION_ROLES['Loan Disbursed']).toEqual(['admin', 'finance']);
    expect(canTransition('Loan Sanctioned', 'Loan Disbursed', { status: 'Loan Sanctioned', loanAmount: 1000, role: 'agent' })).toMatchObject({ allowed: false });
    expect(canTransition('Loan Sanctioned', 'Loan Disbursed', { status: 'Loan Sanctioned', loanAmount: 1000, role: 'finance' }).allowed).toBe(true);
  });

  it('renders only the next actions a role may perform', () => {
    expect(availableTransitions({ status: 'Approved', loanAmount: 57000 }, 'agent')).toEqual([]);
    expect(availableTransitions({ status: 'Approved', loanAmount: 57000 }, 'finance')).toEqual(['Loan Sanctioned']);
    expect(availableTransitions({ status: 'Approved', loanAmount: 0 }, 'agent')).toEqual(['Installation Scheduled']);
    expect(availableTransitions({ status: 'Pending Verification', loanAmount: 0 }, 'admin')).toEqual(['Approved', 'Rejected']);
  });

  it('counts a system as live only from net-meter commissioning', () => {
    expect(isLive('Installed')).toBe(false);
    expect(isLive('Net Meter Commissioned')).toBe(true);
    expect(isLive('Subsidy Credited')).toBe(true);
    expect(isLive('Approved')).toBe(false);
    expect(isLive('Rejected')).toBe(false);
  });

  it('detects milestones from the audit trail', () => {
    const timeline = [
      { status: 'Submitted' as const, at: '2026-01-01T00:00:00.000Z' },
      { status: 'Approved' as const, at: '2026-01-02T00:00:00.000Z' },
    ];
    expect(hasReached('Approved', timeline, 'Approved')).toBe(true);
    expect(hasReached('Approved', timeline, 'Loan Disbursed')).toBe(false);
    expect(milestoneAt('Approved', timeline, 'Approved')).toBe('2026-01-02T00:00:00.000Z');
    expect(hasReached('Subsidy Credited', timeline, 'Approved')).toBe(true);
  });

  it('keeps milestone ordering monotonic', () => {
    const orders = APPLICATION_STATUSES.filter((status) => status !== 'Rejected').map((status) => MILESTONE_ORDER[status]);
    expect([...orders].sort((a, b) => a - b)).toEqual(orders);
    expect(MILESTONE_ORDER.Rejected).toBeLessThan(0);
  });

  it('offers the agreed rejection reasons', () => {
    expect(REJECTION_REASONS).toEqual(['Incomplete documents', 'Roof not suitable', 'Credit not eligible', 'Duplicate', 'Other']);
  });
});
