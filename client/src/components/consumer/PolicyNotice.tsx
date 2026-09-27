import { ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { useLanguage } from '@/context/LanguageContext';
import { formatINR } from '@/utils/format';
import { DEMO_POLICY } from '@/utils/policyConfig';

/** Makes it explicit that subsidy figures are demo assumptions, not official policy. */
export function PolicyNotice() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-start gap-3 rounded-2xl border border-solar-200 bg-solar-50 p-3.5 text-left transition hover:bg-solar-100/60"
      >
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-solar-700" aria-hidden="true" />
        <span>
          <span className="block text-sm font-bold text-solar-900">{t('policyBadge')}</span>
          <span className="mt-0.5 block text-xs leading-relaxed text-solar-900/80">{t('policyText')}</span>
        </span>
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title={t('policyTitle')} description={t('policyText')}>
        <div className="space-y-4 text-sm">
          <table className="w-full text-left">
            <caption className="sr-only">Demo system cost and central subsidy by size</caption>
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="py-1.5">Size</th>
                <th className="py-1.5">{t('systemCost')}</th>
                <th className="py-1.5">{t('centralSubsidy')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Object.keys(DEMO_POLICY.baseSystemCost).map((kw) => (
                <tr key={kw}>
                  <td className="py-2 font-semibold">{kw} kW</td>
                  <td className="py-2 tabular-nums">{formatINR(DEMO_POLICY.baseSystemCost[Number(kw)])}</td>
                  <td className="py-2 tabular-nums">{formatINR(DEMO_POLICY.centralSubsidy[Number(kw)])}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div>
            <p className="mb-1.5 text-xs font-bold uppercase text-slate-500">{t('stateSupport')}</p>
            <ul className="space-y-1">
              {Object.entries(DEMO_POLICY.stateTopUp).map(([state, amount]) => (
                <li key={state} className="flex justify-between">
                  <span>{state.replace(/([a-z])([A-Z])/g, '$1 $2')}</span>
                  <span className="font-semibold tabular-nums">{formatINR(amount)}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-slate-500">Assumed generation: {DEMO_POLICY.unitPerKW} kWh per kW per month.</p>
        </div>
      </Dialog>
    </>
  );
}
