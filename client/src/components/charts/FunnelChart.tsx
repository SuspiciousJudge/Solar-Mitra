import { memo } from 'react';
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { FunnelStage } from '@/types';
import { axisTick, chartTooltipStyle } from './ChartCard';

const COLORS = ['#0f4030', '#136241', '#177a4e', '#259862', '#49b47f', '#7fd0a5'];

function FunnelChartBase({ data }: { data: FunnelStage[] }) {
  const max = Math.max(...data.map((stage) => stage.value), 1);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 48, left: 8, bottom: 4 }}>
        <XAxis type="number" hide domain={[0, max]} />
        <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} tick={{ ...axisTick, fontWeight: 600 }} width={132} />
        <Tooltip
          cursor={{ fill: 'rgba(15,64,46,0.05)' }}
          contentStyle={chartTooltipStyle}
          formatter={(value: number, _name, item) => {
            const stage = item.payload as FunnelStage;
            return [`${value.toLocaleString('en-IN')}${stage.conversionFromPrevious !== null ? ` · ${stage.conversionFromPrevious}% of previous` : ''}`, 'Records'];
          }}
        />
        <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={20}>
          {data.map((stage, index) => (
            <Cell key={stage.key} fill={COLORS[index % COLORS.length]} />
          ))}
          <LabelList dataKey="value" position="right" style={{ fontSize: 12, fontWeight: 700, fill: '#0f172a' }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export const FunnelChart = memo(FunnelChartBase);
