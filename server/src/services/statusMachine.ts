/**
 * Server-enforced status transitions, role permissions and the audit trail.
 *
 * The same rules are mirrored in `client/src/utils/statusFlow.ts`, but the
 * client copy only decides which buttons to render — the API is the referee
 * and answers an illegal move with HTTP 409.
 */
import { REJECTION_REASONS, canTransition, type ApplicationStatus, type RejectionReason, type UserRole } from '../config/statusFlow';
import type { Application, TimelineEvent } from '../types';
import { AppError } from '../utils/AppError';

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin — full access',
  agent: 'Field agent — assigned leads only',
  finance: 'Finance — loans, disbursements and transactions',
  consumer: 'Consumer',
};

export interface Actor {
  userId: string;
  name: string;
  role: UserRole;
}

export interface StatusChangeRequest {
  application: Application;
  next: ApplicationStatus;
  actor: Actor;
  note?: string;
  reason?: RejectionReason;
}

const DEFAULT_NOTES: Record<ApplicationStatus, string> = {
  'Pending Verification': 'Sent back for verification',
  Approved: 'Documents verified — application approved',
  Rejected: 'Application rejected after review',
  'Loan Sanctioned': 'Loan sanctioned by the credit team',
  'Loan Disbursed': 'Loan amount disbursed',
  'Installation Scheduled': 'Installation slot confirmed with the vendor',
  Installed: 'Installation completed',
  'Net Meter Commissioned': 'Net meter commissioned by the DISCOM',
  'Subsidy Claimed': 'Subsidy claim filed on the national portal',
  'Subsidy Credited': 'Subsidy credited to the household account',
  Completed: 'File closed',
};

/** Agents only work the leads assigned to them. */
export function assertCanWorkOn(application: Application, actor: Actor): void {
  if (actor.role !== 'agent') return;
  if (!application.assignedTo || application.assignedTo.userId !== actor.userId) {
    throw new AppError(403, 'Agents can only act on leads assigned to them. Ask an admin to assign this lead first.');
  }
}

export function canAssign(actor: Actor): boolean {
  return actor.role === 'admin' || actor.role === 'agent';
}

export function assertCanAssign(targetUserId: string | null, actor: Actor): void {
  if (!canAssign(actor)) throw new AppError(403, 'Your role cannot reassign leads');
  if (actor.role === 'agent' && targetUserId && targetUserId !== actor.userId) {
    throw new AppError(403, 'Agents can only assign leads to themselves');
  }
  if (actor.role === 'agent' && targetUserId === null) {
    throw new AppError(403, 'Agents cannot unassign leads');
  }
}

export function canRecordTransactions(role: UserRole): boolean {
  return role === 'admin' || role === 'finance';
}

export function canResetDemo(role: UserRole): boolean {
  return role === 'admin';
}

/**
 * Validates a status change and produces the audit-trail entry.
 * Throws an AppError with the right status code when the move is not allowed.
 */
export function planStatusChange(request: StatusChangeRequest): TimelineEvent {
  const { application, next, actor, note, reason } = request;

  const verdict = canTransition(application.status, next, { status: application.status, loanAmount: application.loanAmount, role: actor.role });
  if (!verdict.allowed) {
    // An illegal move in the state machine is a conflict (409); a permission
    // problem is a 403 so the console can explain "ask your admin".
    const isRoleProblem = verdict.reason?.startsWith('Your role');
    throw new AppError(isRoleProblem ? 403 : 409, verdict.reason ?? 'This status change is not allowed');
  }

  assertCanWorkOn(application, actor);

  if (next === 'Rejected') {
    if (!reason) throw new AppError(400, 'A rejection reason is required');
    if (!REJECTION_REASONS.includes(reason)) throw new AppError(400, 'Unknown rejection reason');
    if (reason === 'Other' && (!note || note.trim().length < 3)) {
      throw new AppError(400, 'Please describe the reason when selecting "Other"');
    }
  }

  const composedNote = reason
    ? `${reason}${note && reason !== note ? ` — ${note.trim()}` : ''}`
    : note?.trim() || DEFAULT_NOTES[next];

  return {
    status: next,
    note: composedNote,
    reason: next === 'Rejected' ? reason : undefined,
    at: new Date().toISOString(),
    byUserId: actor.userId,
    byName: actor.name,
    role: actor.role,
  };
}

/** Rejection reasons exposed to the console (single source of truth). */
export { REJECTION_REASONS };
