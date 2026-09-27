import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { getErrorMessage } from '@/services/api';
import { updateLeadStatus } from '@/services/leadService';
import type { Application, ApplicationStatus } from '@/types';

/**
 * Optimistic status change: `apply` updates local UI immediately, and is called
 * again with the previous status if the API call fails.
 */
export function useStatusUpdate() {
  const [pendingId, setPendingId] = useState<string | null>(null);

  const changeStatus = useCallback(
    async (application: Application, status: ApplicationStatus, apply: (id: string, status: ApplicationStatus) => void) => {
      const previous = application.status;
      apply(application.id, status);
      setPendingId(application.id);
      try {
        await updateLeadStatus(application.id, status);
        toast.success(`${application.applicantName} · ${status}`, { description: application.id });
        return true;
      } catch (error) {
        apply(application.id, previous);
        toast.error(getErrorMessage(error, 'Could not update the status. Please try again.'));
        return false;
      } finally {
        setPendingId(null);
      }
    },
    [],
  );

  return { changeStatus, pendingId };
}

export const NEXT_STATUS: Partial<Record<ApplicationStatus, { status: ApplicationStatus; label: string }>> = {
  Approved: { status: 'Installation Scheduled', label: 'Schedule install' },
  'Installation Scheduled': { status: 'Completed', label: 'Mark completed' },
};
