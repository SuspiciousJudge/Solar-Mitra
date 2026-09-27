import { memo } from 'react';
import { Area, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { MonthlyPoint } from '@/types';
import { axisTick, chartTooltipStyle } from './ChartCard';

function CO2GrowthChartBase({ data }: { data: MonthlyPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id="co2Fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tick={axisTick} />
        <YAxis tickLine={false} axisLine={false} tick={axisTick} unit=" t" />
        <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number, name: string) => [`${v.toLocaleString('en-IN')} t`, name]} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        <Area type="monotone" name="Cumulative CO₂ offset" dataKey="cumulativeCO2" stroke="#0284c7" strokeWidth={2.5} fill="url(#co2Fill)" />
        <Line type="monotone" name="Monthly offset" dataKey="co2Tonnes" stroke="#f99d07" strokeWidth={2} dot={{ r: 3 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export const CO2GrowthChart = memo(CO2GrowthChartBase);
