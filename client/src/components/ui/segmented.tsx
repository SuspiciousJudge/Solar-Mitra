import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface Option<T extends string> {
  value: T;
  label: ReactNode;
}

interface SegmentedControlProps<T extends string> {
  name: string;
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  className?: string;
}

/** Radio-group toggle with an animated highlight (arrow keys work natively). */
export function SegmentedControl<T extends string>({ name, label, value, options, onChange, className }: SegmentedControlProps<T>) {
  return (
    <fieldset className={cn('rounded-2xl bg-slate-100 p-1', className)}>
      <legend className="sr-only">{label}</legend>
      <div className="grid" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((option) => {
          const active = option.value === value;
          return (
            <label key={option.value} className="relative cursor-pointer">
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={active}
                onChange={() => onChange(option.value)}
                className="peer sr-only"
              />
              {active && (
                <motion.span
                  layoutId={`${name}-highlight`}
                  className="absolute inset-0 rounded-xl bg-white shadow-sm"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              <span
                className={cn(
                  'relative z-10 flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-center text-sm font-semibold transition-colors',
                  'peer-focus-visible:ring-2 peer-focus-visible:ring-solar-400',
                  active ? 'text-forest-800' : 'text-slate-500',
                )}
              >
                {option.label}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
