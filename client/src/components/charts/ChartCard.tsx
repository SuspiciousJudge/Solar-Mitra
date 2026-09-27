import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';

export function ChartCard({ title, subtitle, children, action }: { title: string; subtitle?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <Card className="flex flex-col p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-bold text-slate-900">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="h-64 w-full">{children}</div>
    </Card>
  );
}

export const chartTooltipStyle = {
  borderRadius: 14,
  border: '1px solid #e2e8f0',
  boxShadow: '0 12px 32px -12px rgba(15,64,46,0.25)',
  fontSize: 12,
  fontWeight: 600,
};

export const axisTick = { fontSize: 12, fill: '#64748b' };
