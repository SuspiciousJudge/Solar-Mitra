import { CalendarCheck, CircleCheckBig, CircleX, Clock, CreditCard, FileCheck2, HandCoins, Landmark, Plug, Receipt, ThumbsUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { MILESTONE_ORDER, type ApplicationStatus } from '@/types';
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

export function StatusBadge({ status, className }: { status: ApplicationStatus; className?: string }) {
  const variant = (STATUS_BADGE_VARIANT[status] ?? 'gray') as Variant;
  const Icon = ICONS[status] ?? Clock;
  const milestone = MILESTONE_ORDER[status];
  return (
    <Badge variant={variant} className={className} title={`Milestone ${milestone + 1} of 10`}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {status}
    </Badge>
  );
}
