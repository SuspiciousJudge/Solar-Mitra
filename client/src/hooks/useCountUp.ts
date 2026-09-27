import { animate, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

/** Animates a number from its previous value to `target`. Respects reduced-motion preferences. */
export function useCountUp(target: number, duration = 1.2): number {
  const safeTarget = Number.isFinite(target) ? target : 0;
  const reduceMotion = useReducedMotion();
  const [value, setValue] = useState(reduceMotion ? safeTarget : 0);
  const previous = useRef(reduceMotion ? safeTarget : 0);

  useEffect(() => {
    if (reduceMotion) {
      setValue(safeTarget);
      previous.current = safeTarget;
      return undefined;
    }
    const controls = animate(previous.current, safeTarget, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: setValue,
    });
    previous.current = safeTarget;
    return () => controls.stop();
  }, [safeTarget, duration, reduceMotion]);

  return value;
}
