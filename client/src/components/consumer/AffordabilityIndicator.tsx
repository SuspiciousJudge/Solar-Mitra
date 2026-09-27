import { CircleAlert, CircleCheck, CircleMinus } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { cn } from '@/utils/cn';
import type { Affordability } from '@/utils/solarCalculator';

const CONFIG = {
  comfortable: { icon: CircleCheck, className: 'bg-forest-50 text-forest-800 ring-forest-600/20', level: 1 },
  moderate: { icon: CircleMinus, className: 'bg-solar-50 text-solar-800 ring-solar-600/25', level: 2 },
  high: { icon: CircleAlert, className: 'bg-red-50 text-red-700 ring-red-600/20', level: 3 },
} as const;

/** Icon + word + meter, so the meaning never relies on colour alone. */
export function AffordabilityIndicator({ level }: { level: Affordability }) {
  const { t } = useLanguage();
  const { icon: Icon, className, level: bars } = CONFIG[level];
  return (
    <div className={cn('flex items-center justify-between gap-3 rounded-2xl px-4 py-3 ring-1 ring-inset', className)}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{t('affordability')}</p>
        <p className="flex items-center gap-1.5 text-base font-bold">
          <Icon className="h-5 w-5" aria-hidden="true" />
          {t(level)}
        </p>
        <p className="text-xs opacity-80">{t('affordabilityHint')}</p>
      </div>
      <div className="flex items-end gap-1" aria-hidden="true">
        {[1, 2, 3].map((bar) => (
          <span key={bar} className={cn('w-2 rounded-full bg-current', bar <= bars ? 'opacity-100' : 'opacity-20')} style={{ height: 8 + bar * 7 }} />
        ))}
      </div>
    </div>
  );
}
