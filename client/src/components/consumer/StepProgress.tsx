import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import type { TranslationKey } from '@/i18n/translations';
import { cn } from '@/utils/cn';

const STEPS: TranslationKey[] = ['stepAudit', 'stepSubsidy', 'stepFinance', 'stepVendor'];
const JOURNEY_STEP_EVENT = 'solarmitra:guided-step';

function progressForJourneyStep(step: number) {
  if (step < 4) return 1; // electricity through preferences
  if (step === 4) return 2; // solar plan
  if (step === 5) return 3; // financing
  return 4; // installer and review
}

function readSavedProgress(fallback: number) {
  try {
    const draft = JSON.parse(localStorage.getItem('solarmitra.guided-draft') ?? '{}') as { step?: number };
    return Number.isInteger(draft.step) ? progressForJourneyStep(draft.step as number) : fallback;
  } catch {
    return fallback;
  }
}

export function StepProgress({ current }: { current: number }) {
  const { t } = useLanguage();
  const [activeStep, setActiveStep] = useState(() => readSavedProgress(current));

  useEffect(() => {
    const onJourneyStep = (event: Event) => {
      const step = (event as CustomEvent<number>).detail;
      if (Number.isInteger(step)) setActiveStep(progressForJourneyStep(step));
    };
    window.addEventListener(JOURNEY_STEP_EVENT, onJourneyStep);
    return () => window.removeEventListener(JOURNEY_STEP_EVENT, onJourneyStep);
  }, []);

  return (
    <nav aria-label={t('progressLabel', { current: activeStep, total: STEPS.length })} className="px-4 pb-3">
      <ol className="grid grid-cols-4 gap-1.5">
        {STEPS.map((key, index) => {
          const number = index + 1;
          const done = number < activeStep;
          const active = number === activeStep;
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
