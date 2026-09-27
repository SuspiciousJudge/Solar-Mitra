import type { ChangeEvent, CSSProperties } from 'react';
import { cn } from '@/utils/cn';

interface SliderProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  formatValue?: (value: number) => string;
  className?: string;
}

/** Native range input (keyboard + screen-reader friendly) with a filled track. */
export function Slider({ id, label, value, min, max, step = 1, onChange, formatValue, className }: SliderProps) {
  const percent = max > min ? ((value - min) / (max - min)) * 100 : 0;
  const display = formatValue ? formatValue(value) : String(value);
  return (
    <div className={className}>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-semibold text-slate-700">
          {label}
        </label>
        <output htmlFor={id} className="text-base font-bold tabular-nums text-forest-800">
          {display}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={display}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(Number(event.target.value))}
        className={cn('sm-range w-full')}
        style={{ '--fill': `${percent}%` } as CSSProperties}
      />
      <div className="mt-1 flex justify-between text-xs text-slate-400">
        <span>{formatValue ? formatValue(min) : min}</span>
        <span>{formatValue ? formatValue(max) : max}</span>
      </div>
    </div>
  );
}
