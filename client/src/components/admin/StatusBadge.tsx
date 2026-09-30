import { CalendarCheck, CircleCheckBig, CircleX, Clock, CreditCard, FileCheck2, HandCoins, Landmark, Plug, Receipt, ThumbsUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { MILESTONE_ORDER, type ApplicationStatus } from '@/types';
import { cn } from '@/utils/cn';
import { STATUS_BADGE_VARIANT } from '@/utils/statusVisuals';

type Variant = 'yellow' | 'green' | 'red' | 'blue' | 'purple' | 'gray' | 'outline';

/** One visual language for all 11 lifecycle statuses. */
const ICONS: Record<ApplicationStatus, typeof Clock> = {
  'Pending Verification': Clock,
  Approved: ThumbsUp,
  Rejected: CircleX,
  'Loan Sanctioned': Landmark,
  'Loan Disbursed': HandCoins,
  'Installation Scheduled': CalendarCheck,
  Installed: FileCheck2,
  'Net Meter Commissioned': Plug,
  'Subsidy Claimed': Receipt,
  'Subsidy Credited': CreditCard,
  Completed: CircleCheckBig,
};

/**
 * A status pill always stays on one line. If its container is ever narrower than
 * the label it is cut with an ellipsis (the full status is in the tooltip) rather
 * than wrapping into a lopsided two-line pill.
 */
export function StatusBadge({ status, className }: { status: ApplicationStatus; className?: string }) {
  const variant = (STATUS_BADGE_VARIANT[status] ?? 'gray') as Variant;
  const Icon = ICONS[status] ?? Clock;
  const milestone = MILESTONE_ORDER[status];
  // Rejected sits outside the 10-step milestone ladder, so it has no "step n of 10".
  const title = milestone >= 0 ? `${status} · milestone ${milestone + 1} of 10` : status;
  return (
    <Badge variant={variant} className={cn('max-w-full whitespace-nowrap', className)} title={title}>
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span className="truncate">{status}</span>
    </Badge>
  );
}
