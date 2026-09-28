import type { BadgeVariant } from '@/components/ui/badge';
import type { ApplicationStatus } from '@/types';

/**
 * Colour language for the 11 lifecycle statuses, shared by the operator console
 * and the consumer tracking screen so a household sees the same colour an
 * operator does. (Not part of the server mirror — purely presentational.)
 */
export const STATUS_BADGE_VARIANT: Record<ApplicationStatus, BadgeVariant> = {
  'Pending Verification': 'yellow',
  Approved: 'blue',
  Rejected: 'red',
  'Loan Sanctioned': 'purple',
  'Loan Disbursed': 'purple',
  'Installation Scheduled': 'blue',
  Installed: 'green',
  'Net Meter Commissioned': 'green',
  'Subsidy Claimed': 'yellow',
  'Subsidy Credited': 'green',
  Completed: 'green',
};
