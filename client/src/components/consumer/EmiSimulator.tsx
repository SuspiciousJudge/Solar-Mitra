import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { useLanguage } from '@/context/LanguageContext';
import { formatINR } from '@/utils/format';
import { calculateLoanSummary, getAffordability } from '@/utils/solarCalculator';
import { AffordabilityIndicator } from './AffordabilityIndicator';

export interface LoanTerms {
  loanAmount: number;
  interestRate: number;
  tenureMonths: number;
}

interface EmiSimulatorProps {
  terms: LoanTerms;
  maxLoan: number;
  currentBill: number;
  onChange: (terms: LoanTerms) => void;
}

export function EmiSimulator({ terms, maxLoan, currentBill, onChange }: EmiSimulatorProps) {
  const { t } = useLanguage();
  const summary = calculateLoanSummary(terms.loanAmount, terms.interestRate, terms.tenureMonths);
  const update = (patch: Partial<LoanTerms>) => onChange({ ...terms, ...patch });

  return (
    <Card className="p-5">
      <h2 className="text-base font-bold text-slate-900">{t('simulatorTitle')}</h2>
      <div className="mt-5 space-y-6">
        <Slider
          id="loan-amount"
          label={t('loanAmount')}
          value={terms.loanAmount}
          min={0}
          max={Math.max(maxLoan, 1000)}
          step={1000}
          onChange={(loanAmount) => update({ loanAmount: Math.min(loanAmount, maxLoan) })}
          formatValue={formatINR}
        />
        <Slider
          id="interest-rate"
          label={t('interestRate')}
          value={terms.interestRate}
          min={5}
          max={18}
          step={0.25}
          onChange={(interestRate) => update({ interestRate })}
          formatValue={(v) => `${v.toFixed(2).replace(/\.?0+$/, '')}%`}
        />
        <Slider
          id="tenure"
          label={t('tenure')}
          value={terms.tenureMonths}
          min={12}
          max={84}
          step={6}
          onChange={(tenureMonths) => update({ tenureMonths })}
          formatValue={(v) => `${v} ${t('months')}`}
        />
      </div>

      <dl className="mt-6 grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-3 text-center" aria-live="polite">
        <div>
          <dt className="text-[11px] font-semibold uppercase text-slate-500">{t('monthlyEmi')}</dt>
          <dd className="mt-0.5 text-base font-extrabold tabular-nums text-forest-800">{formatINR(summary.emi)}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase text-slate-500">{t('totalInterest')}</dt>
          <dd className="mt-0.5 text-base font-bold tabular-nums text-slate-900">{formatINR(summary.totalInterest)}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase text-slate-500">{t('totalRepayment')}</dt>
          <dd className="mt-0.5 text-base font-bold tabular-nums text-slate-900">{formatINR(summary.totalRepayment)}</dd>
        </div>
      </dl>

      <div className="mt-4">
        {terms.loanAmount === 0 ? (
          <p className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600">{t('noLoanNote')}</p>
        ) : (
          <AffordabilityIndicator level={getAffordability(summary.emi, currentBill)} />
        )}
      </div>
    </Card>
  );
}
