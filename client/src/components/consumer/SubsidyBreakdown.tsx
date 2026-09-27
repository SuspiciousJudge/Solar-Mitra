import { motion } from 'framer-motion';
import { Minus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/context/LanguageContext';
import { formatINR } from '@/utils/format';
import type { SolarRecommendation } from '@/utils/solarCalculator';

export function SubsidyBreakdown({ recommendation }: { recommendation: SolarRecommendation }) {
  const { t } = useLanguage();
  const rows = [
    { label: t('systemCost'), value: recommendation.marketCost, deduction: false },
    { label: t('centralSubsidy'), value: recommendation.centralSubsidy, deduction: true },
    { label: t('stateSupport'), value: recommendation.stateSubsidy, deduction: true },
  ];

  return (
    <Card className="p-5">
      <h2 className="text-base font-bold text-slate-900">{t('breakdownTitle')}</h2>
      <dl className="mt-4 space-y-3">
        {rows.map((row, index) => (
          <motion.div
            key={row.label}
            className="flex items-center justify-between gap-3"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 + index * 0.18 }}
          >
            <dt className="flex items-center gap-2 text-[15px] text-slate-600">
              {row.deduction && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-forest-100 text-forest-700" aria-hidden="true">
                  <Minus className="h-3 w-3" strokeWidth={3} />
                </span>
              )}
              {row.label}
            </dt>
            <dd className={row.deduction ? 'text-base font-bold tabular-nums text-forest-700' : 'text-base font-bold tabular-nums text-slate-900'}>
              {row.deduction ? `− ${formatINR(row.value)}` : formatINR(row.value)}
            </dd>
          </motion.div>
        ))}
        <motion.div
          className="flex items-center justify-between gap-3 border-t-2 border-dashed border-slate-200 pt-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.85 }}
        >
          <dt className="text-[15px] font-bold text-slate-900">{t('netCost')}</dt>
          <dd className="text-xl font-extrabold tabular-nums text-slate-900">{formatINR(recommendation.netCost)}</dd>
        </motion.div>
      </dl>
      <p className="mt-3 rounded-xl bg-forest-50 px-3 py-2 text-sm font-semibold text-forest-800">
        {t('totalSubsidy')}: <span className="tabular-nums">{formatINR(recommendation.totalSubsidy)}</span>
      </p>
      {!recommendation.stateSupported && <p className="mt-2 text-xs text-slate-500">{t('noStateTopUp')}</p>}
    </Card>
  );
}
