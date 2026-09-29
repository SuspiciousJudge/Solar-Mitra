import { memo } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { RegionalPoint } from '@/types';
import { axisTick, chartTooltipStyle } from './ChartCard';

const COLORS = ['#136241', '#177a4e', '#259862', '#49b47f', '#7fd0a5'];

function RegionalAdoptionChartBase({ data }: { data: RegionalPoint[] }) {
  const sorted = [...data]
    .filter((row) => row.applications > 0)
    .sort((a, b) => b.applications - a.applications)
    .slice(0, 8);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={sorted} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid horizontal={false} stroke="#f1f5f9" />
        <XAxis type="number" tickLine={false} axisLine={false} tick={axisTick} />
        <YAxis type="category" dataKey="state" tickLine={false} axisLine={false} tick={{ ...axisTick, fontWeight: 600 }} width={118} />
        <Tooltip
          cursor={{ fill: 'rgba(15,64,46,0.05)' }}
          contentStyle={chartTooltipStyle}
          formatter={(value: number, _name, item) => {
            const row = item.payload as RegionalPoint;
            return [`${value} applications · ${row.capacityKW.toLocaleString('en-IN')} kW live`, 'Adoption'];
          }}
        />
        <Bar dataKey="applications" radius={[0, 10, 10, 0]} barSize={22}>
          {sorted.map((row, index) => (
            <Cell key={row.code} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export const RegionalAdoptionChart = memo(RegionalAdoptionChartBase);
