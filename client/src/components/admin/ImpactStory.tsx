import { ArrowRight, Banknote, CloudOff, Home, SolarPanel, Zap } from 'lucide-react';
import type { AnalyticsOverview } from '@/types';
import { formatCapacity, formatINRCompact, formatNumber } from '@/utils/format';

/** More households → more capacity → more clean electricity → lower emissions → more green finance. */
export function ImpactStory({ overview }: { overview: AnalyticsOverview }) {
  const steps = [
    { icon: Home, label: 'More households', value: formatNumber(overview.households) },
    { icon: SolarPanel, label: 'More solar capacity', value: formatCapacity(overview.capacityKW) },
    { icon: Zap, label: 'More clean electricity', value: `${formatNumber(overview.annualCleanEnergyMWh)} MWh/yr` },
    { icon: CloudOff, label: 'Lower estimated emissions', value: `${formatNumber(overview.co2OffsetTonnes)} t CO₂` },
    { icon: Banknote, label: 'More green financing', value: formatINRCompact(overview.loansDisbursedINR) },
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
