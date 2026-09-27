import { memo } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { MonthlyPoint } from '@/types';
import { axisTick, chartTooltipStyle } from './ChartCard';

function InstallationsChartBase({ data }: { data: MonthlyPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="installFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#259862" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#259862" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tick={axisTick} />
        <YAxis tickLine={false} axisLine={false} tick={axisTick} label={{ value: 'Installations', angle: -90, position: 'insideLeft', offset: 20, style: { fontSize: 11, fill: '#94a3b8' } }} />
        <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => [v.toLocaleString('en-IN'), 'Installations']} />
        <Area type="monotone" dataKey="installations" stroke="#177a4e" strokeWidth={3} fill="url(#installFill)" activeDot={{ r: 6, fill: '#ffbf20', stroke: '#177a4e', strokeWidth: 2 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export const InstallationsChart = memo(InstallationsChartBase);
