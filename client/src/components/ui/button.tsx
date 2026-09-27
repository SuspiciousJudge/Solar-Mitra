import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { LoaderCircle } from 'lucide-react';
import { cn } from '@/utils/cn';

export type ButtonVariant = 'primary' | 'solar' | 'outline' | 'ghost' | 'danger' | 'subtle' | 'white';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl' | 'icon';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-forest-700 text-white shadow-sm hover:bg-forest-800 active:bg-forest-900',
  solar: 'bg-solar-400 text-forest-950 shadow-sm hover:bg-solar-300 active:bg-solar-500',
  outline: 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 hover:border-slate-400',
  ghost: 'text-slate-700 hover:bg-slate-100',
  danger: 'bg-red-600 text-white shadow-sm hover:bg-red-700',
  subtle: 'bg-forest-50 text-forest-800 hover:bg-forest-100',
  white: 'bg-white text-forest-900 shadow-sm hover:bg-forest-50',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm rounded-lg gap-1.5',
  md: 'h-11 px-4 text-sm rounded-xl gap-2',
  lg: 'h-12 px-5 text-base rounded-xl gap-2',
  xl: 'min-h-14 px-6 py-3 text-base rounded-2xl gap-2.5',
  icon: 'h-10 w-10 rounded-xl',
};

export function buttonVariants({
  variant = 'primary',
  size = 'md',
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return cn(
    'inline-flex items-center justify-center font-semibold transition-colors duration-150 select-none',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-solar-400 focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    variants[variant],
    sizes[size],
    className,
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={buttonVariants({ variant, size, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  ),
);
Button.displayName = 'Button';
