import { motion } from 'framer-motion';
import { Check, Circle, CircleDot, X } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import type { ApplicationStatus } from '@/types';
import { cn } from '@/utils/cn';
import { getJourneySteps } from '@/utils/journey';

/** ✓ done · ● current · ○ upcoming — each with a text label, not colour alone. */
export function JourneyTimeline({ status }: { status: ApplicationStatus }) {
  const { t } = useLanguage();
  const steps = getJourneySteps(status);
  const stateLabel = { done: t('done'), current: t('inProgress'), upcoming: t('upcoming'), stopped: t('status_Rejected') };

  return (
    <ol className="relative space-y-0">
      {steps.map((step, index) => {
        const last = index === steps.length - 1;
        return (
          <motion.li
            key={step.key}
            className="relative flex gap-3 pb-5 last:pb-0"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + index * 0.1 }}
          >
            {!last && (
              <span
                className={cn('absolute left-[15px] top-8 h-[calc(100%-24px)] w-0.5', step.state === 'done' ? 'bg-forest-500' : 'bg-slate-200')}
                aria-hidden="true"
              />
            )}
            <span
              className={cn(
                'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                step.state === 'done' && 'bg-forest-600 text-white',
                step.state === 'current' && 'bg-solar-100 text-solar-700 ring-4 ring-solar-200',
                step.state === 'upcoming' && 'border-2 border-slate-200 bg-white text-slate-300',
                step.state === 'stopped' && 'bg-red-100 text-red-600',
              )}
              aria-hidden="true"
            >
              {step.state === 'done' && <Check className="h-4 w-4" strokeWidth={3} />}
              {step.state === 'current' && <CircleDot className="h-4 w-4 animate-pulse" />}
              {step.state === 'upcoming' && <Circle className="h-3 w-3" />}
              {step.state === 'stopped' && <X className="h-4 w-4" strokeWidth={3} />}
            </span>
            <div className="flex flex-1 items-center justify-between gap-2 pt-1">
              <span className={cn('text-[15px] font-semibold', step.state === 'upcoming' ? 'text-slate-400' : 'text-slate-900')}>{t(step.key)}</span>
              <span
                className={cn(
                  'text-xs font-semibold',
                  step.state === 'done' && 'text-forest-700',
                  step.state === 'current' && 'text-solar-700',
                  step.state === 'upcoming' && 'text-slate-400',
                  step.state === 'stopped' && 'text-red-600',
                )}
              >
                {stateLabel[step.state]}
              </span>
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}
