import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';

export function Progress({ value, label, className }: { value: number; label: string; className?: string }) {
  const clamped = Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-slate-200', className)}
    >
      <motion.div className="h-full rounded-full bg-gradient-to-r from-forest-500 to-solar-400" animate={{ width: `${clamped}%` }} transition={{ ease: 'easeOut' }} />
    </div>
  );
}
