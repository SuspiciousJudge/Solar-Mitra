import { Sun } from 'lucide-react';
import { cn } from '@/utils/cn';

interface LogoProps {
  className?: string;
  tone?: 'dark' | 'light';
  showTagline?: boolean;
  tagline?: string;
}

export function Logo({ className, tone = 'dark', showTagline = false, tagline = 'Your Solar Friend' }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-forest-800 shadow-sm">
        <Sun className="h-5 w-5 text-solar-400" strokeWidth={2.5} aria-hidden="true" />
      </span>
      <span className="flex flex-col leading-none">
        <span className={cn('text-lg font-extrabold tracking-tight', tone === 'dark' ? 'text-forest-900' : 'text-white')}>
          Solar<span className="text-solar-500">Mitra</span>
        </span>
        {showTagline && <span className={cn('mt-0.5 text-[11px] font-medium', tone === 'dark' ? 'text-slate-500' : 'text-forest-100')}>{tagline}</span>}
      </span>
    </span>
  );
}
