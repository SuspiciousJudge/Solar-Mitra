import { Info, TreePine } from 'lucide-react';
import { ImpactStory } from '@/components/admin/ImpactStory';
import { PageHeader } from '@/components/admin/PageHeader';
import { ChartCard } from '@/components/charts/ChartCard';
import { CO2GrowthChart } from '@/components/charts/CO2GrowthChart';
import { InstallationsChart } from '@/components/charts/InstallationsChart';
import { LoanDisbursementChart } from '@/components/charts/LoanDisbursementChart';
import { RegionalAdoptionChart } from '@/components/charts/RegionalAdoptionChart';
import { AnimatedNumber } from '@/components/shared/AnimatedNumber';
import { ErrorState } from '@/components/shared/States';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { formatCapacity, formatNumber } from '@/utils/format';

export function AnalyticsPage() {
  useDocumentTitle('Climate Impact');
  const analytics = useAnalytics();
  const data = analytics.data;

  if (analytics.error) return <ErrorState message={analytics.error} onRetry={analytics.reload} />;

  return (
    <div className="space-y-6">
      <PageHeader title="Climate Impact" subtitle="How green financing translates into clean energy and lower estimated emissions." />

      {data ? (
        <section className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-3xl bg-gradient-to-br from-forest-900 to-forest-950 p-6 lg:col-span-2">
            <h2 className="mb-4 font-bold text-white">From households to green finance</h2>
            <ImpactStory overview={data.overview} />
          </div>
          <Card className="relative overflow-hidden p-6">
            <TreePine className="absolute -bottom-4 -right-4 h-32 w-32 text-forest-100" aria-hidden="true" />
            <p className="relative text-sm font-bold uppercase tracking-wide text-forest-700">Estimated Climate Impact</p>
            <p className="relative mt-3 text-sm text-slate-600">Equivalent to planting approximately</p>
            <AnimatedNumber value={data.overview.equivalentTrees} format={(v) => formatNumber(Math.round(v))} className="relative block text-4xl font-extrabold text-forest-900" />
            <p className="relative text-sm font-semibold text-slate-700">trees</p>
            <p className="relative mt-4 flex gap-1.5 text-[11px] leading-relaxed text-slate-500">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>
                {data.overview.methodology.label}: grid factor {data.overview.methodology.gridEmissionFactorKgPerKWh} kg CO₂/kWh and{' '}
                {data.overview.methodology.kgCO2PerTreePerYear} kg CO₂ per tree per year. {data.overview.methodology.note}
              </span>
            </p>
          </Card>
        </section>
      ) : (
        <Skeleton className="h-48 rounded-3xl" />
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Solar installations over time" subtitle="Monthly installations">
          {data ? <InstallationsChart data={data.monthly} /> : <Skeleton className="h-full w-full" />}
        </ChartCard>
        <ChartCard title="Regional adoption" subtitle="Households transitioned by state">
          {data ? <RegionalAdoptionChart data={data.regional} /> : <Skeleton className="h-full w-full" />}
        </ChartCard>
        <ChartCard title="CO₂ offset growth" subtitle="Estimated tonnes avoided (demo emission factor)">
          {data ? <CO2GrowthChart data={data.monthly} /> : <Skeleton className="h-full w-full" />}
        </ChartCard>
        <ChartCard title="Green loan disbursement" subtitle="Monthly and cumulative (₹ lakh)">
          {data ? <LoanDisbursementChart data={data.monthly} /> : <Skeleton className="h-full w-full" />}
        </ChartCard>
      </div>

      {data && (
        <Card className="overflow-hidden">
          <div className="p-5 pb-3">
            <h2 className="font-bold text-slate-900">State breakdown</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-5 py-3">State</th>
                  <th scope="col" className="px-5 py-3">Households</th>
                  <th scope="col" className="px-5 py-3">Capacity</th>
                  <th scope="col" className="px-5 py-3">Green loans</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.regional.map((row) => (
                  <tr key={row.state}>
                    <td className="px-5 py-3 font-semibold text-slate-900">{row.state}</td>
                    <td className="px-5 py-3 tabular-nums">{formatNumber(row.households)}</td>
                    <td className="px-5 py-3 tabular-nums">{formatCapacity(row.capacityKW)}</td>
                    <td className="px-5 py-3 tabular-nums">₹{formatNumber(row.loansLakh)} L</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
