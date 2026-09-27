import { motion } from 'framer-motion';
import { ArrowRight, PiggyBank, SolarPanel, TriangleAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ClimateImpactCard } from '@/components/consumer/ClimateImpactCard';
import { PolicyNotice } from '@/components/consumer/PolicyNotice';
import { RequireBill } from '@/components/consumer/RequireBill';
import { ScreenHeading } from '@/components/consumer/ScreenHeading';
import { StickyActions } from '@/components/consumer/StickyActions';
import { SubsidyBreakdown } from '@/components/consumer/SubsidyBreakdown';
import { AnimatedNumber } from '@/components/shared/AnimatedNumber';
import { Disclaimer } from '@/components/shared/Disclaimer';
import { PageTransition } from '@/components/shared/PageTransition';
import { Button } from '@/components/ui/button';
import { useConsumer } from '@/context/ConsumerContext';
import { useLanguage } from '@/context/LanguageContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { formatINR, formatNumber } from '@/utils/format';

function SubsidyContent() {
  const { t } = useLanguage();
  const { billData, solarRecommendation } = useConsumer();
  const navigate = useNavigate();
  useDocumentTitle(t('stepSubsidy'));
  if (!billData || !solarRecommendation) return null;
  const rec = solarRecommendation;

  return (
    <>
      <PageTransition className="space-y-4 px-5 pb-6 pt-5">
        <ScreenHeading title={t('goodNews')} subtitle={t('basedOn', { units: formatNumber(billData.monthlyUnits), state: billData.state })} />

        <div className="grid grid-cols-5 gap-3">
          <motion.div
            className="col-span-2 flex flex-col justify-between rounded-3xl bg-forest-50 p-4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <SolarPanel className="h-7 w-7 text-forest-700" aria-hidden="true" />
            <div className="mt-3">
              <p className="text-xs font-semibold text-forest-800">{t('recommendedSystem')}</p>
              <p className="text-4xl font-extrabold tabular-nums leading-tight text-forest-900">
                {rec.recommendedKW}
                <span className="ml-1 text-xl">kW</span>
              </p>
              <p className="mt-1 text-[11px] leading-snug text-forest-700">{t('generatesAbout', { units: formatNumber(rec.estimatedMonthlyGeneration) })}</p>
            </div>
          </motion.div>

          <motion.div
            className="col-span-3 flex flex-col justify-between rounded-3xl bg-gradient-to-br from-forest-700 to-forest-900 p-4 text-white shadow-lift"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <p className="text-xs font-semibold text-forest-100">{t('netCostLabel')}</p>
            <AnimatedNumber value={rec.netCost} format={formatINR} className="mt-2 block text-[34px] font-extrabold leading-none tracking-tight" duration={1.4} />
            <p className="mt-2 text-xs text-forest-200 line-through decoration-forest-300/70">{formatINR(rec.marketCost)}</p>
          </motion.div>
        </div>

        {rec.capped && (
          <p className="flex gap-2 rounded-2xl bg-solar-50 p-3 text-sm text-solar-900">
            <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
            {t('highUsageNote')}
          </p>
        )}

        <SubsidyBreakdown recommendation={rec} />

        <motion.div
          className="flex items-center gap-4 rounded-3xl border-2 border-solar-300 bg-solar-50 p-4"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-solar-400">
            <PiggyBank className="h-6 w-6 text-forest-950" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold text-solar-900">{t('potentialSavings')}</p>
            <p className="text-2xl font-extrabold tabular-nums text-slate-900">
              {formatINR(rec.estimatedMonthlySavings)}
              <span className="text-base font-bold text-slate-600">{t('perMonth')}</span>
            </p>
          </div>
        </motion.div>

        <Disclaimer>{t('savingsDisclaimer')}</Disclaimer>
        <ClimateImpactCard systemKW={rec.recommendedKW} monthlyGeneration={rec.estimatedMonthlyGeneration} />
        <PolicyNotice />
      </PageTransition>
      <StickyActions>
        <Button size="xl" onClick={() => navigate('/consumer/financing')}>
          {t('seeFinancing')} <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </Button>
      </StickyActions>
    </>
  );
}

export function SubsidyPage() {
  return (
    <RequireBill>
      <SubsidyContent />
    </RequireBill>
  );
}
