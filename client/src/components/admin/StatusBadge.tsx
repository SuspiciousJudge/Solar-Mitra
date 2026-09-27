import { CalendarCheck, CircleCheckBig, CircleX, Clock, ThumbsUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { ApplicationStatus } from '@/types';

const CONFIG: Record<ApplicationStatus, { variant: 'yellow' | 'green' | 'red' | 'blue' | 'purple'; icon: typeof Clock }> = {
  'Pending Verification': { variant: 'yellow', icon: Clock },
  Approved: { variant: 'green', icon: ThumbsUp },
  Rejected: { variant: 'red', icon: CircleX },
  'Installation Scheduled': { variant: 'blue', icon: CalendarCheck },
  Completed: { variant: 'purple', icon: CircleCheckBig },
};

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  const { variant, icon: Icon } = CONFIG[status];
  return (
    <Badge variant={variant} className="whitespace-nowrap">
      <Icon className="h-3 w-3" aria-hidden="true" />
      {status}
    </Badge>
  );
}
