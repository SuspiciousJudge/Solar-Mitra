import { describe, expect, it } from 'vitest';
import { APPLICATION_STATUSES, MILESTONE_ORDER, STATUS_FLOW, availableTransitions, canTransition, isLive, nextStatuses } from './statusFlow';
import { getJourneySteps } from './journey';
import { STATUS_BADGE_VARIANT } from './statusVisuals';

describe('consumer journey & status visuals', () => {
  it('walks a household through six steps', () => {
    expect(getJourneySteps('Pending Verification').map((step) => step.state)).toEqual(['done', 'done', 'done', 'current', 'upcoming', 'upcoming']);
    expect(getJourneySteps('Completed').every((step) => step.state === 'done')).toBe(true);
    expect(getJourneySteps('Rejected')[3].state).toBe('stopped');
  });

  it('never leaves a gap: exactly one current step (or none when done)', () => {
    APPLICATION_STATUSES.forEach((status) => {
      const current = getJourneySteps(status).filter((step) => step.state === 'current').length;
      expect(current).toBeLessThanOrEqual(1);
    });
  });

  it('has a badge colour for every status', () => {
    APPLICATION_STATUSES.forEach((status) => {
      expect(STATUS_BADGE_VARIANT[status]).toBeTruthy();
    });
  });
});

describe('status machine guardrails', () => {
  it('makes financed files walk the loan steps and lets upfront files skip them', () => {
    expect(nextStatuses({ status: 'Approved', loanAmount: 57000 })).toEqual(['Loan Sanctioned']);
    expect(nextStatuses({ status: 'Approved', loanAmount: 0 })).toEqual(['Installation Scheduled']);
  });

  it('counts a file as live only after net-meter commissioning', () => {
    expect(isLive('Installed')).toBe(false);
    expect(isLive('Net Meter Commissioned')).toBe(true);
    expect(isLive('Rejected')).toBe(false);
  });

  it('gates money movements to finance and admins', () => {
    expect(availableTransitions({ status: 'Loan Sanctioned', loanAmount: 57000 }, 'agent')).toEqual([]);
    expect(availableTransitions({ status: 'Loan Sanctioned', loanAmount: 57000 }, 'finance')).toEqual(['Loan Disbursed']);
    expect(canTransition('Loan Sanctioned', 'Loan Disbursed', { status: 'Loan Sanctioned', loanAmount: 57000, role: 'agent' }).allowed).toBe(false);
  });

  it('keeps milestone order monotonic', () => {
    const orders = APPLICATION_STATUSES.filter((status) => status !== 'Rejected').map((status) => MILESTONE_ORDER[status]);
    expect([...orders].sort((a, b) => a - b)).toEqual(orders);
    expect(STATUS_FLOW.Completed).toEqual([]);
  });
});
