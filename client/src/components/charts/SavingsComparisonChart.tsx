import { memo } from 'react';
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatINR } from '@/utils/format';

interface SavingsComparisonChartProps {
  currentBill: number;
  emi: number;
  solarBill: number;
  labels: { currentBill: string; solarEmi: string; solarBill: string };
}

function SavingsComparisonChartBase({ currentBill, emi, solarBill, labels }: SavingsComparisonChartProps) {
  const data = [
    { name: labels.currentBill, value: currentBill, color: '#94a3b8' },
    { name: labels.solarEmi, value: emi, color: '#177a4e' },
    { name: labels.solarBill, value: solarBill, color: '#ffbf20' },
  ];

  return (
    <figure>
      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 24, right: 4, left: 4, bottom: 0 }}>
            <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#475569', fontWeight: 600 }} interval={0} />
            <YAxis hide domain={[0, (max: number) => Math.max(max * 1.1, 100)]} />
            <Tooltip cursor={{ fill: 'rgba(15,64,46,0.05)' }} formatter={(value: number) => [formatINR(value), '']} separator="" />
            <Bar dataKey="value" radius={[12, 12, 4, 4]} maxBarSize={64} isAnimationActive animationDuration={900}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
              <LabelList dataKey="value" position="top" formatter={(value: number) => formatINR(value)} style={{ fontSize: 13, fontWeight: 800, fill: '#0f172a' }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">
        {data.map((d) => `${d.name}: ${formatINR(d.value)}`).join(', ')}
      </figcaption>
    </figure>
  );
}

export const SavingsComparisonChart = memo(SavingsComparisonChartBase);
