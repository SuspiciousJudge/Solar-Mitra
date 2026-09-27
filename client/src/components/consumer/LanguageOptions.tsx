import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { LANGUAGE_OPTIONS } from '@/i18n/translations';
import type { Language } from '@/types';
import { cn } from '@/utils/cn';

interface LanguageOptionsProps {
  onSelected?: (language: Language) => void;
  compact?: boolean;
}

/** Large, high-contrast language buttons — each shows its own script plus the English name. */
export function LanguageOptions({ onSelected, compact = false }: LanguageOptionsProps) {
  const { language, hasChosenLanguage, setLanguage } = useLanguage();

  return (
    <div role="radiogroup" aria-label="Language" className="grid gap-3">
      {LANGUAGE_OPTIONS.map((option, index) => {
        const selected = hasChosenLanguage && option.code === language;
        return (
          <motion.button
            key={option.code}
            type="button"
            role="radio"
            aria-checked={selected}
            lang={option.code}
            onClick={() => {
              setLanguage(option.code);
              onSelected?.(option.code);
            }}
            initial={compact ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: compact ? 0 : 0.08 * index }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              'flex items-center justify-between rounded-2xl border-2 px-5 text-left transition-colors',
              compact ? 'min-h-14' : 'min-h-[72px]',
              selected ? 'border-forest-600 bg-forest-50' : 'border-slate-200 bg-white hover:border-forest-300 hover:bg-forest-50/40',
            )}
          >
            <span className="flex flex-col">
              <span className={cn('font-bold text-slate-900', compact ? 'text-lg' : 'text-xl')}>{option.label}</span>
              {option.label !== option.english && <span className="text-xs font-medium text-slate-500">{option.english}</span>}
            </span>
            <span
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-full border-2',
                selected ? 'border-forest-600 bg-forest-600 text-white' : 'border-slate-300',
              )}
              aria-hidden="true"
            >
              {selected && <Check className="h-4 w-4" strokeWidth={3} />}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
