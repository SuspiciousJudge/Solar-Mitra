import { forwardRef, type InputHTMLAttributes, type LabelHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';

const fieldBase =
  'w-full rounded-xl border bg-white px-4 text-base text-slate-900 placeholder:text-slate-400 transition-colors ' +
  'focus:outline-none focus:ring-2 focus:ring-forest-500/40 focus:border-forest-600 disabled:bg-slate-50 disabled:text-slate-500';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  invalid?: boolean;
  prefix?: ReactNode;
  suffix?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, invalid, prefix, suffix, ...props }, ref) => (
  <div className="relative">
    {prefix && <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-500">{prefix}</span>}
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(fieldBase, 'h-12', invalid ? 'border-red-400' : 'border-slate-300', prefix && 'pl-9', suffix && 'pr-16', className)}
      {...props}
    />
    {suffix && <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-medium text-slate-500">{suffix}</span>}
  </div>
));
Input.displayName = 'Input';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({ className, invalid, children, ...props }, ref) => (
  <div className="relative">
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(fieldBase, 'h-12 appearance-none pr-10', invalid ? 'border-red-400' : 'border-slate-300', className)}
      {...props}
    >
      {children}
    </select>
    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
  </div>
));
Select.displayName = 'Select';

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('mb-1.5 block text-sm font-semibold text-slate-700', className)} {...props} />;
}

interface FieldProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}

/** Label + control + friendly error/hint, wired up with aria-describedby. */
export function Field({ id, label, error, hint, children, className }: FieldProps) {
  return (
    <div className={className}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-sm font-medium text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
