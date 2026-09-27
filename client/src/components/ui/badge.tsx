import type { HTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

type BadgeVariant = 'green' | 'yellow' | 'gray' | 'red' | 'blue' | 'purple' | 'outline';

const variants: Record<BadgeVariant, string> = {
  green: 'bg-forest-50 text-forest-800 ring-forest-600/20',
  yellow: 'bg-solar-50 text-solar-800 ring-solar-600/25',
  gray: 'bg-slate-100 text-slate-700 ring-slate-500/15',
  red: 'bg-red-50 text-red-700 ring-red-600/20',
  blue: 'bg-sky-50 text-sky-800 ring-sky-600/20',
  purple: 'bg-violet-50 text-violet-800 ring-violet-600/20',
  outline: 'bg-white text-slate-700 ring-slate-300',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ className, variant = 'gray', ...props }: BadgeProps) {
  return (
    <span
      className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset', variants[variant], className)}
      {...props}
    />
  );
}
