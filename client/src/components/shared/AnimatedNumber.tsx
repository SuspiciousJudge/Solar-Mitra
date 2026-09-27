import { useCountUp } from '@/hooks/useCountUp';

interface AnimatedNumberProps {
  value: number;
  format?: (value: number) => string;
  duration?: number;
  className?: string;
}

/** Count-up number. The final value is exposed to assistive tech immediately. */
export function AnimatedNumber({ value, format = (v) => Math.round(v).toLocaleString('en-IN'), duration, className }: AnimatedNumberProps) {
  const current = useCountUp(value, duration);
  return (
    <span className={className}>
      <span aria-hidden="true" className="tabular-nums">
        {format(current)}
      </span>
      <span className="sr-only">{format(value)}</span>
    </span>
  );
}
