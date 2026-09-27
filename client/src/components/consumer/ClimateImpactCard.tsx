import { Leaf, TreePine } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { formatNumber } from '@/utils/format';
import { calculateCO2Impact } from '@/utils/solarCalculator';

export function ClimateImpactCard({ systemKW, monthlyGeneration }: { systemKW: number; monthlyGeneration: number }) {
  const { t } = useLanguage();
  const impact = calculateCO2Impact(systemKW, monthlyGeneration);
  return (
    <section className="rounded-3xl bg-gradient-to-br from-forest-800 to-forest-950 p-5 text-white" aria-labelledby="climate-title">
      <div className="flex items-center gap-2">
        <Leaf className="h-5 w-5 text-solar-300" aria-hidden="true" />
        <h2 id="climate-title" className="text-base font-bold">
          {t('climateTitle')}
        </h2>
      </div>
      <div className="mt-4 flex items-end gap-4">
        <p className="text-4xl font-extrabold tabular-nums leading-none">
          {formatNumber(impact.estimatedCO2OffsetTonnes)}
          <span className="ml-1 text-base font-semibold text-forest-200">t CO₂/yr</span>
        </p>
        <TreePine className="mb-1 h-8 w-8 text-forest-300" aria-hidden="true" />
      </div>
      <p className="mt-3 text-sm leading-relaxed text-forest-100">
        {t('climateText', { tonnes: formatNumber(impact.estimatedCO2OffsetTonnes), trees: formatNumber(impact.equivalentTrees) })}
      </p>
      <p className="mt-1 text-sm text-forest-100">{t('cleanEnergyYear', { units: formatNumber(impact.annualCleanEnergy) })}</p>
      <p className="mt-3 text-[11px] text-forest-300">{t('climateNote')}</p>
    </section>
  );
}
