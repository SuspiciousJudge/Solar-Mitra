import type { ReactNode } from 'react';

/** Bottom action bar that stays visible while the screen content scrolls. */
export function StickyActions({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-20 mt-auto border-t border-slate-100 bg-white/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}
