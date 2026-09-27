import { memo } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { RegionalPoint } from '@/types';
import { axisTick, chartTooltipStyle } from './ChartCard';

const COLORS = ['#136241', '#177a4e', '#259862', '#49b47f', '#7fd0a5'];

function RegionalAdoptionChartBase({ data }: { data: RegionalPoint[] }) {
  const sorted = [...data].sort((a, b) => b.households - a.households);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={sorted} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid horizontal={false} stroke="#f1f5f9" />
        <XAxis type="number" tickLine={false} axisLine={false} tick={axisTick} />
        <YAxis type="category" dataKey="state" tickLine={false} axisLine={false} tick={{ ...axisTick, fontWeight: 600 }} width={104} />
        <Tooltip
          cursor={{ fill: 'rgba(15,64,46,0.05)' }}
          contentStyle={chartTooltipStyle}
          formatter={(value: number, _name, item) => [`${value} households · ${(item.payload as RegionalPoint).capacityKW} kW`, 'Adoption']}
        />
        <Bar dataKey="households" radius={[0, 10, 10, 0]} barSize={22}>
          {sorted.map((row, index) => (
            <Cell key={row.state} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export const RegionalAdoptionChart = memo(RegionalAdoptionChartBase);
