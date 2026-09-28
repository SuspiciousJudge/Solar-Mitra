import { BadgeIndianRupee, Landmark } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/context/LanguageContext';
import { useAsync } from '@/hooks/useAsync';
import { fetchSchemes } from '@/services/schemeService';
import type { SubsidyScheme } from '@/types';
import { formatINR } from '@/utils/format';
import type { SolarRecommendation } from '@/utils/solarCalculator';

/**
 * Shows which schemes the household's numbers come from. The amounts are the
 * same ones the calculator used, so the household can trace every rupee back to
 * a named central or state scheme.
 */
export function SchemeStack({ state, recommendation }: { state: string; recommendation: SolarRecommendation }) {
  const { t } = useLanguage();
  const query = useAsync(() => fetchSchemes({ state }), [state]);

  const schemes = (query.data ?? []).filter((scheme) => (scheme.state ? scheme.state === state : true));
  const amountFor = (scheme: SubsidyScheme): number | null => {
    if (scheme.id === 'pm-surya-ghar-rts') return recommendation.centralSubsidy;
    if (scheme.state && scheme.supportType === 'consumer_subsidy') return recommendation.stateSubsidy;
    return null;
  };

  if (query.loading) return <Skeleton className="h-28 rounded-3xl" />;
  if (!query.data) return null;

  const consumerSchemes = schemes.filter((scheme) => !scheme.supportType || scheme.supportType === 'consumer_subsidy');

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">{t('schemeStackTitle')}</h2>
          <p className="mt-0.5 text-xs text-slate-500">{t('schemeStackHint')}</p>
        </div>
        <BadgeIndianRupee className="h-5 w-5 shrink-0 text-forest-600" aria-hidden="true" />
      </div>
      <ul className="mt-4 space-y-2">
        {consumerSchemes.map((scheme) => {
          const amount = amountFor(scheme);
          return (
            <li key={scheme.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-100 px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{scheme.name}</p>
                <p className="truncate text-xs text-slate-500">{scheme.calcDescription}</p>
              </div>
              <div className="flex items-center gap-2">
                {scheme.state ? (
                  <Badge variant="yellow">
                    <Landmark className="h-3 w-3" aria-hidden="true" />
                    {scheme.state}
                  </Badge>
                ) : (
                  <Badge variant="green">Central</Badge>
                )}
                {amount !== null && amount > 0 && <span className="text-sm font-bold tabular-nums text-forest-800">− {formatINR(amount)}</span>}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 rounded-xl bg-forest-50 px-3 py-2 text-xs font-semibold text-forest-800">{t('schemeDisclaimer')}</p>
    </Card>
  );
}
