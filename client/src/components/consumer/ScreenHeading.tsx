import type { ReactNode } from 'react';

export function ScreenHeading({ title, subtitle, eyebrow }: { title: string; subtitle?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="space-y-1.5">
      {eyebrow}
      <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-slate-900 text-balance">{title}</h1>
      {subtitle && <p className="text-[15px] leading-relaxed text-slate-600">{subtitle}</p>}
    </div>
  );
}
