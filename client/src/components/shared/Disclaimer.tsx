import { Info } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

export function Disclaimer({ children, className, tone = 'gray' }: { children: ReactNode; className?: string; tone?: 'gray' | 'yellow' }) {
  return (
    <p
      className={cn(
        'flex gap-2 rounded-2xl px-3.5 py-3 text-xs leading-relaxed',
        tone === 'yellow' ? 'bg-solar-50 text-solar-900' : 'bg-slate-100/80 text-slate-600',
        className,
      )}
    >
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
