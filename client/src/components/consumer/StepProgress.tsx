import { Check } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import type { TranslationKey } from '@/i18n/translations';
import { cn } from '@/utils/cn';

const STEPS: TranslationKey[] = ['stepAudit', 'stepSubsidy', 'stepFinance', 'stepVendor'];

export function StepProgress({ current }: { current: number }) {
  const { t } = useLanguage();
  return (
    <nav aria-label={t('progressLabel', { current, total: STEPS.length })} className="px-4 pb-3">
      <ol className="grid grid-cols-4 gap-1.5">
        {STEPS.map((key, index) => {
          const number = index + 1;
          const done = number < current;
          const active = number === current;
          return (
            <li key={key} aria-current={active ? 'step' : undefined} className="flex flex-col gap-1.5">
              <span className={cn('h-1.5 rounded-full transition-colors', done || active ? 'bg-forest-600' : 'bg-slate-200', active && 'bg-gradient-to-r from-forest-600 to-solar-400')} />
              <span className={cn('flex items-center gap-1 truncate text-[11px] font-semibold', active ? 'text-forest-800' : done ? 'text-forest-600' : 'text-slate-400')}>
                {done && <Check className="h-3 w-3 shrink-0" aria-hidden="true" />}
                {t(key)}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
