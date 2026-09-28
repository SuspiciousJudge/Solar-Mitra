import { motion } from 'framer-motion';
import { Minus, TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react';
import { AnimatedNumber } from '@/components/shared/AnimatedNumber';
import { cn } from '@/utils/cn';

interface KpiCardProps {
  label: string;
  value: number;
  format: (value: number) => string;
  icon: LucideIcon;
  change?: number;
  changeLabel?: string;
  /** Set for metrics where a fall is good (e.g. SLA breaches). */
  invertChange?: boolean;
  accent: 'green' | 'yellow' | 'sky' | 'emerald';
  index: number;
  footnote?: string;
}

const ACCENTS = {
  green: 'bg-forest-50 text-forest-700',
  yellow: 'bg-solar-50 text-solar-700',
  sky: 'bg-sky-50 text-sky-700',
  emerald: 'bg-emerald-50 text-emerald-700',
};

export function KpiCard({ label, value, format, icon: Icon, change, changeLabel = 'vs previous period', invertChange = false, accent, index, footnote }: KpiCardProps) {
  const rounded = change === undefined ? 0 : Math.round(change * 10) / 10;
  const positive = invertChange ? rounded < 0 : rounded > 0;
  const flat = rounded === 0;
  return (
    <motion.article
      className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-soft"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-slate-500">{label}</p>
        <span className={cn('flex h-10 w-10 items-center justify-center rounded-2xl', ACCENTS[accent])}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
      <AnimatedNumber value={value} format={format} className="mt-3 block text-3xl font-extrabold tracking-tight text-slate-900 xl:text-4xl" />
      {change !== undefined && (
        <p
          className={cn(
            'mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold',
            flat ? 'bg-slate-100 text-slate-600' : positive ? 'bg-forest-50 text-forest-700' : 'bg-red-50 text-red-700',
          )}
        >
          {flat ? <Minus className="h-3.5 w-3.5" aria-hidden="true" /> : positive ? <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" /> : <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />}
          <span>{`${rounded > 0 ? '+' : ''}${rounded.toFixed(1)}%`}</span>
          <span className="font-medium opacity-80">{changeLabel}</span>
        </p>
      )}
      {footnote && <p className="mt-2 text-xs text-slate-400">{footnote}</p>}
    </motion.article>
  );
}
