import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { getErrorMessage } from '@/services/api';
import { updateApplicationStatus } from '@/services/applicationService';
import { updateLeadStatus } from '@/services/leadService';
import { availableTransitions, isLive, type ApplicationStatus, type Application, type RejectionReason, type UserRole } from '@/types';

interface ChangeOptions {
  note?: string;
  reason?: RejectionReason;
  /** `applications` calls the applications endpoint; `leads` the leads endpoint. */
  via?: 'leads' | 'applications';
}

/**
 * Status change with an optimistic local update. The server remains the source
 * of truth: it re-validates the transition and rejects illegal moves, in which
 * case the previous status is restored.
 */
export function useStatusUpdate(via: 'leads' | 'applications' = 'leads') {
  const [pendingId, setPendingId] = useState<string | null>(null);

  const changeStatus = useCallback(
    async (application: Application, status: ApplicationStatus, apply: (id: string, status: ApplicationStatus) => void, options: ChangeOptions = {}) => {
      const previous = application.status;
      apply(application.id, status);
      setPendingId(application.id);
      try {
        const call = (options.via ?? via) === 'applications' ? updateApplicationStatus : updateLeadStatus;
        const updated = await call(application.id, status, options.note);
        toast.success(`${application.applicantName} · ${status}`, {
          description: updated.id ? `${updated.id}${isLive(status) ? ' · now generating clean energy' : ''}` : application.id,
        });
        return true;
      } catch (error) {
        apply(application.id, previous);
        toast.error(getErrorMessage(error, 'Could not update the status. Please try again.'));
        return false;
      } finally {
        setPendingId(null);
      }
    },
    [via],
  );

  return { changeStatus, pendingId };
}

/** Transitions the given role may perform next, in flow order. */
export function nextActionsFor(application: Application, role: UserRole | undefined): ApplicationStatus[] {
  return availableTransitions({ status: application.status, loanAmount: application.loanAmount }, role);
}

export const ACTION_LABELS: Partial<Record<ApplicationStatus, string>> = {
  Approved: 'Approve',
  Rejected: 'Reject',
  'Loan Sanctioned': 'Sanction loan',
  'Loan Disbursed': 'Disburse loan',
  'Installation Scheduled': 'Schedule install',
  Installed: 'Mark installed',
  'Net Meter Commissioned': 'Net meter commissioned',
  'Subsidy Claimed': 'Subsidy claimed',
  'Subsidy Credited': 'Credit subsidy',
  Completed: 'Complete file',
};
