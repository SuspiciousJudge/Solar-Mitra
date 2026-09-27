import { memo } from 'react';
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { MonthlyPoint } from '@/types';
import { axisTick, chartTooltipStyle } from './ChartCard';

const lakh = (v: number) => (v >= 100 ? `₹${(v / 100).toFixed(2)} Cr` : `₹${v.toFixed(1)} L`);

function LoanDisbursementChartBase({ data }: { data: MonthlyPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 8, right: 0, left: -8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tick={axisTick} />
        <YAxis yAxisId="monthly" tickLine={false} axisLine={false} tick={axisTick} tickFormatter={(v: number) => `${v}L`} />
        <YAxis yAxisId="total" orientation="right" tickLine={false} axisLine={false} tick={axisTick} tickFormatter={(v: number) => `${(v / 100).toFixed(0)}Cr`} />
        <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number, name: string) => [lakh(v), name]} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        <Bar yAxisId="monthly" name="Disbursed (month)" dataKey="loansLakh" fill="#ffbf20" radius={[8, 8, 0, 0]} barSize={22} />
        <Line yAxisId="total" name="Cumulative" type="monotone" dataKey="cumulativeLoansLakh" stroke="#136241" strokeWidth={2.5} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export const LoanDisbursementChart = memo(LoanDisbursementChartBase);
