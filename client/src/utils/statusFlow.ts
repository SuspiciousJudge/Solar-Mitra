/**
 * Canonical operator status machine — shared by the API (server-enforced
 * transitions) and the operator console (which only renders valid next actions).
 *
 * Mirrored byte-for-byte at `client/src/utils/statusFlow.ts`; a server test
 * (`server/tests/statusFlowSync.test.ts`) fails if the two copies drift apart.
 * This file must stay dependency-free so both packages can consume it verbatim.
 */

export const APPLICATION_STATUSES = [
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
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export type UserRole = 'admin' | 'agent' | 'finance' | 'consumer';

/**
 * Allowed transitions. Loan steps are only valid for financed applications —
 * see `nextStatuses`, which filters them out for upfront/no-loan cases.
 */
export const STATUS_FLOW: Record<ApplicationStatus, ApplicationStatus[]> = {
  'Pending Verification': ['Approved', 'Rejected'],
  Approved: ['Loan Sanctioned', 'Installation Scheduled'],
  'Loan Sanctioned': ['Loan Disbursed'],
  'Loan Disbursed': ['Installation Scheduled'],
  'Installation Scheduled': ['Installed'],
  Installed: ['Net Meter Commissioned'],
  'Net Meter Commissioned': ['Subsidy Claimed'],
  'Subsidy Claimed': ['Subsidy Credited'],
  'Subsidy Credited': ['Completed'],
  Completed: [],
  Rejected: [],
};

/** Ordinal position used for "has this application reached X yet?" checks. */
export const MILESTONE_ORDER: Record<ApplicationStatus, number> = {
  'Pending Verification': 0,
  Approved: 1,
  'Loan Sanctioned': 2,
  'Loan Disbursed': 3,
  'Installation Scheduled': 4,
  Installed: 5,
  'Net Meter Commissioned': 6,
  'Subsidy Claimed': 7,
  'Subsidy Credited': 8,
  Completed: 9,
  Rejected: -1,
};

/** Statuses that mean "the system is generating" — status ≥ Net Meter Commissioned. */
export const LIVE_FROM = 'Net Meter Commissioned' as const;

export const MILESTONES: ApplicationStatus[] = APPLICATION_STATUSES.filter((status) => status !== 'Rejected');

/** Button labels for each transition target. */
export const TRANSITION_LABELS: Record<ApplicationStatus, string> = {
  'Pending Verification': 'Send for verification',
  Approved: 'Approve',
  Rejected: 'Reject',
  'Loan Sanctioned': 'Mark loan sanctioned',
  'Loan Disbursed': 'Mark loan disbursed',
  'Installation Scheduled': 'Schedule installation',
  Installed: 'Mark installed',
  'Net Meter Commissioned': 'Net meter commissioned',
  'Subsidy Claimed': 'Mark subsidy claimed',
  'Subsidy Credited': 'Mark subsidy credited',
  Completed: 'Mark completed',
};

/** Roles allowed to perform each transition. */
export const TRANSITION_ROLES: Record<ApplicationStatus, UserRole[]> = {
  'Pending Verification': [],
  Approved: ['admin', 'agent'],
  Rejected: ['admin', 'agent'],
  'Loan Sanctioned': ['admin', 'finance'],
  'Loan Disbursed': ['admin', 'finance'],
  'Installation Scheduled': ['admin', 'agent'],
  Installed: ['admin', 'agent'],
  'Net Meter Commissioned': ['admin', 'agent'],
  'Subsidy Claimed': ['admin', 'agent', 'finance'],
  'Subsidy Credited': ['admin', 'finance'],
  Completed: ['admin', 'agent'],
};

/** Money-moving transitions that the finance desk owns. */
export const FINANCE_TRANSITIONS: ApplicationStatus[] = ['Loan Sanctioned', 'Loan Disbursed', 'Subsidy Credited'];

export const REJECTION_REASONS = [
  'Incomplete documents',
  'Roof not suitable',
  'Credit not eligible',
  'Duplicate',
  'Other',
] as const;

export type RejectionReason = (typeof REJECTION_REASONS)[number];

export interface TransitionContext {
  status: ApplicationStatus;
  /** Loan amount sanctioned/requested at submission time (0 = paying upfront). */
  loanAmount: number;
}

/**
 * Valid next statuses for one application. Financed applications must walk the
 * loan steps; upfront applications skip them.
 */
export function nextStatuses(application: TransitionContext): ApplicationStatus[] {
  const financed = application.loanAmount > 0;
  return STATUS_FLOW[application.status].filter((target) => {
    if (!financed && (target === 'Loan Sanctioned' || target === 'Loan Disbursed')) return false;
    if (financed && application.status === 'Approved' && target === 'Installation Scheduled') return false;
    return true;
  });
}

/** Only the next actions this role may actually perform. */
export function availableTransitions(application: TransitionContext, role: UserRole | undefined): ApplicationStatus[] {
  if (!role) return [];
  return nextStatuses(application).filter((target) => TRANSITION_ROLES[target].includes(role));
}

export function canTransition(
  from: ApplicationStatus,
  to: ApplicationStatus,
  application: TransitionContext & { role?: UserRole },
): { allowed: boolean; reason?: string } {
  if (from === to) return { allowed: false, reason: `Application is already ${to}` };
  if (!STATUS_FLOW[from].includes(to)) {
    return { allowed: false, reason: `Cannot move from "${from}" to "${to}". Allowed next: ${STATUS_FLOW[from].join(', ') || 'none'}` };
  }
  if (!nextStatuses({ status: from, loanAmount: application.loanAmount }).includes(to)) {
    return {
      allowed: false,
      reason:
        application.loanAmount > 0
          ? 'A financed application must be sanctioned and disbursed before installation can be scheduled'
          : 'This application is paying upfront, so loan steps do not apply',
    };
  }
  if (application.role && !TRANSITION_ROLES[to].includes(application.role)) {
    return { allowed: false, reason: `Your role cannot mark an application as "${to}"` };
  }
  return { allowed: true };
}

export interface StatusTimelineEvent {
  status: ApplicationStatus | 'Submitted';
  at: string;
}

/** True when the application has ever reached `target` (timeline-based). */
export function hasReached(status: ApplicationStatus, timeline: StatusTimelineEvent[], target: ApplicationStatus): boolean {
  if (status === target) return true;
  const targetOrder = MILESTONE_ORDER[target];
  if (targetOrder < 0) return status === target;
  return timeline.some((event) => {
    if (!(event.status in MILESTONE_ORDER)) return false;
    const order = MILESTONE_ORDER[event.status as ApplicationStatus];
    return order >= 0 && order >= targetOrder;
  });
}

/** Systems that are generating (status ≥ Net Meter Commissioned). */
export function isLive(status: ApplicationStatus): boolean {
  return MILESTONE_ORDER[status] >= MILESTONE_ORDER[LIVE_FROM];
}

/** First and last event timestamp for a milestone, used for duration metrics. */
export function milestoneAt(status: ApplicationStatus, timeline: StatusTimelineEvent[], target: ApplicationStatus): string | undefined {
  if (status === target) return timeline[timeline.length - 1]?.at;
  return timeline.find((event) => event.status === target)?.at;
}
