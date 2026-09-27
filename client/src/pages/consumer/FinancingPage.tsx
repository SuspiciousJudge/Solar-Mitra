import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Banknote, CalendarClock, TrendingDown, Wallet } from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EmiSimulator, type LoanTerms } from '@/components/consumer/EmiSimulator';
import { RequireBill } from '@/components/consumer/RequireBill';
import { ScreenHeading } from '@/components/consumer/ScreenHeading';
import { StickyActions } from '@/components/consumer/StickyActions';
import { AnimatedNumber } from '@/components/shared/AnimatedNumber';
import { Disclaimer } from '@/components/shared/Disclaimer';
import { PageTransition } from '@/components/shared/PageTransition';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SegmentedControl } from '@/components/ui/segmented';
import { Skeleton } from '@/components/ui/skeleton';
import { useConsumer } from '@/context/ConsumerContext';
import { useLanguage } from '@/context/LanguageContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { FinancingChoice } from '@/types';
import { formatINR } from '@/utils/format';
import { DEMO_POLICY } from '@/utils/policyConfig';
import { calculateLoanSummary } from '@/utils/solarCalculator';

const SavingsComparisonChart = lazy(() =>
  import('@/components/charts/SavingsComparisonChart').then((m) => ({ default: m.SavingsComparisonChart })),
);

type Mode = FinancingChoice['mode'];

function FinancingContent() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { billData, solarRecommendation, activeFinancing, setFinancing } = useConsumer();
  useDocumentTitle(t('stepFinance'));

  const netCost = solarRecommendation?.netCost ?? 0;
  const [mode, setMode] = useState<Mode>(activeFinancing?.mode ?? 'emi');
  const [terms, setTerms] = useState<LoanTerms>({
    loanAmount: Math.min(activeFinancing?.loanAmount ?? netCost, netCost),
    interestRate: activeFinancing?.interestRate ?? 7.5,
    tenureMonths: activeFinancing?.tenureMonths ?? 36,
  });

  if (!billData || !solarRecommendation) return null;

  const { emi } = calculateLoanSummary(terms.loanAmount, terms.interestRate, terms.tenureMonths);
  const currentBill = billData.monthlyBill || Math.round(billData.monthlyUnits * DEMO_POLICY.fallbackTariffPerUnit);
  const solarBill = Math.max(0, currentBill - solarRecommendation.estimatedMonthlySavings);
  const monthlyDifference = currentBill - emi - solarBill;
  const upfrontPayment = mode === 'emi' ? netCost - terms.loanAmount : netCost;
  const paybackMonths = solarRecommendation.estimatedMonthlySavings > 0 ? Math.ceil(netCost / solarRecommendation.estimatedMonthlySavings) : 0;

  const persist = (nextMode: Mode, nextTerms: LoanTerms) => {
    const loanAmount = nextMode === 'emi' ? nextTerms.loanAmount : 0;
    const summary = calculateLoanSummary(loanAmount, nextTerms.interestRate, nextTerms.tenureMonths);
    setFinancing({ mode: nextMode, loanAmount, interestRate: nextTerms.interestRate, tenureMonths: nextTerms.tenureMonths, emi: summary.emi });
  };

  const changeMode = (next: Mode) => {
    setMode(next);
    persist(next, terms);
  };

  const changeTerms = (next: LoanTerms) => {
    setTerms(next);
    persist(mode, next);
  };

  return (
    <>
      <PageTransition className="space-y-4 px-5 pb-6 pt-5">
        <ScreenHeading title={t('financeTitle')} subtitle={t('financeSubtitle')} />

        <SegmentedControl<Mode>
          name="payment-mode"
          label={t('financeTitle')}
          value={mode}
          onChange={changeMode}
          options={[
            { value: 'upfront', label: <><Wallet className="h-4 w-4" aria-hidden="true" /> {t('payUpfront')}</> },
            { value: 'emi', label: <><Banknote className="h-4 w-4" aria-hidden="true" /> {t('satinEmi')}</> },
          ]}
        />

        <AnimatePresence mode="wait" initial={false}>
          {mode === 'upfront' ? (
            <motion.div key="upfront" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
              <Card className="p-5 text-center">
                <p className="text-sm font-semibold text-slate-500">{t('payOnce')}</p>
                <p className="mt-1 text-5xl font-extrabold tabular-nums tracking-tight text-slate-900">{formatINR(netCost)}</p>
                <p className="mt-3 text-sm text-slate-600">{t('upfrontNote')}</p>
              </Card>
              <Card className="flex items-center gap-4 p-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-forest-50">
                  <CalendarClock className="h-6 w-6 text-forest-700" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-500">{t('monthlySavingsLabel')}</p>
                  <p className="text-xl font-extrabold tabular-nums text-forest-800">
                    {formatINR(solarRecommendation.estimatedMonthlySavings)}
                    <span className="text-sm font-bold text-slate-500">{t('perMonth')}</span>
                  </p>
                  {paybackMonths > 0 && <p className="text-xs text-slate-500">{t('paybackText', { months: paybackMonths })}</p>}
                </div>
              </Card>
            </motion.div>
          ) : (
            <motion.div key="emi" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
              <Card className="overflow-hidden">
                <div className="bg-gradient-to-br from-forest-700 to-forest-900 p-5 text-white">
                  <p className="text-sm font-semibold text-forest-100">{t('monthlyEmi')}</p>
                  <p className="mt-1 flex items-baseline gap-1">
                    <AnimatedNumber value={emi} format={formatINR} duration={0.6} className="text-5xl font-extrabold tracking-tight" />
                    <span className="text-lg font-bold text-forest-200">{t('perMonth')}</span>
                  </p>
                  <p className="mt-2 text-sm text-forest-100">
                    {formatINR(terms.loanAmount)} · {t('emiTerms', { months: terms.tenureMonths, rate: terms.interestRate })}
                  </p>
                  {upfrontPayment > 0 && <p className="mt-1 text-xs text-solar-200">+ {formatINR(upfrontPayment)} {t('payOnce').toLowerCase()}</p>}
                </div>
                <div className="p-5">
                  <h2 className="text-base font-bold text-slate-900">{t('compareTitle')}</h2>
                  <Suspense fallback={<Skeleton className="mt-3 h-52 w-full" />}>
                    <SavingsComparisonChart
                      currentBill={currentBill}
                      emi={emi}
                      solarBill={solarBill}
                      labels={{ currentBill: t('currentBill'), solarEmi: t('solarEmi'), solarBill: t('solarBill') }}
                    />
                  </Suspense>
                  {monthlyDifference > 0 ? (
                    <div className="mt-2 flex items-center gap-3 rounded-2xl bg-forest-50 p-4">
                      <TrendingDown className="h-8 w-8 shrink-0 text-forest-600" aria-hidden="true" />
                      <div>
                        <p className="text-lg font-extrabold text-forest-900">{t('saveFromMonthOne')}</p>
                        <p className="text-sm text-forest-800">
                          {t('monthlyDifference')}: <strong className="text-base tabular-nums">~{formatINR(monthlyDifference)}</strong>
                          {t('perMonth')}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2 rounded-2xl bg-solar-50 p-4 text-sm font-semibold text-solar-900">{t('emiAboveBill')}</p>
                  )}
                  <p className="mt-3 text-[11px] leading-relaxed text-slate-500">{t('comparisonFootnote')}</p>
                </div>
              </Card>
              <EmiSimulator terms={terms} maxLoan={netCost} currentBill={currentBill} onChange={changeTerms} />
            </motion.div>
          )}
        </AnimatePresence>

        <Disclaimer tone="yellow">{t('financialDisclaimer')}</Disclaimer>
      </PageTransition>
      <StickyActions>
        <Button
          size="xl"
          onClick={() => {
            persist(mode, terms);
            navigate('/consumer/vendors');
          }}
        >
          {t('chooseVendor')} <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </Button>
      </StickyActions>
    </>
  );
}

export function FinancingPage() {
  return (
    <RequireBill>
      <FinancingContent />
    </RequireBill>
  );
}
