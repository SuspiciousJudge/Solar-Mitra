import { ArrowRight, Banknote, CloudOff, Home, SolarPanel, Zap } from 'lucide-react';
import type { AnalyticsOverview } from '@/types';
import { formatCapacity, formatINRCompact, formatNumber } from '@/utils/format';

/** Households → capacity → clean electricity → lower emissions → green finance. */
export function ImpactStory({ overview }: { overview: AnalyticsOverview }) {
  const steps = [
    { icon: Home, label: 'Households transitioned', value: formatNumber(overview.climate.systemsLive) },
    { icon: SolarPanel, label: 'Clean energy capacity', value: formatCapacity(overview.climate.installedKW) },
    { icon: Zap, label: 'Clean electricity / year', value: `${formatNumber(overview.climate.estAnnualMWh)} MWh` },
    { icon: CloudOff, label: 'Estimated CO₂ avoided', value: `${formatNumber(overview.climate.co2AvoidedTonnes)} t` },
    { icon: Banknote, label: 'Green loans disbursed', value: formatINRCompact(overview.finance.disbursed.amountINR) },
  ];
  return (
    <ol className="grid gap-2 md:grid-cols-5">
      {steps.map((step, index) => (
        <li key={step.label} className="relative flex items-center gap-3 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10 md:flex-col md:items-start">
          <step.icon className="h-5 w-5 shrink-0 text-solar-300" aria-hidden="true" />
          <div>
            <p className="text-lg font-extrabold tabular-nums text-white">{step.value}</p>
            <p className="text-xs font-medium text-forest-200">{step.label}</p>
          </div>
          {index < steps.length - 1 && (
            <ArrowRight className="absolute -right-3 top-1/2 z-10 hidden h-4 w-4 -translate-y-1/2 text-solar-400 md:block" aria-hidden="true" />
          )}
        </li>
      ))}
    </ol>
  );
}
