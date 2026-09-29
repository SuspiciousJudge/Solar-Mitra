import { Info, Leaf, TreePine } from 'lucide-react';
import { FilterBar } from '@/components/admin/FilterBar';
import { ImpactStory } from '@/components/admin/ImpactStory';
import { KpiCard } from '@/components/admin/KpiCard';
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
import { useOperatorFilters } from '@/hooks/useOperatorFilters';
import { formatCapacity, formatINRCompact, formatNumber } from '@/utils/format';

export function AnalyticsPage() {
  useDocumentTitle('Climate Impact');
  const filters = useOperatorFilters();
  const analytics = useAnalytics(filters.queryParams);
  const data = analytics.data;
  const overview = data?.overview;

  if (analytics.error) return <ErrorState message={analytics.error} onRetry={analytics.reload} />;

  return (
    <div className="space-y-6">
      <PageHeader title="Climate Impact" subtitle="How green financing translates into clean energy and lower estimated emissions — by state, district and scheme." />

      <FilterBar api={filters} asOf={overview?.asOf} onRefresh={analytics.reload} refreshing={analytics.loading} />

      {!overview ? (
        <Skeleton className="h-48 rounded-3xl" />
      ) : (
        <>
          <section className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-3xl bg-gradient-to-br from-forest-900 to-forest-950 p-6 lg:col-span-2">
              <h2 className="mb-4 font-bold text-white">From households to green finance</h2>
              <ImpactStory overview={overview} />
            </div>
            <Card className="relative overflow-hidden p-6">
              <TreePine className="absolute -bottom-4 -right-4 h-32 w-32 text-forest-100" aria-hidden="true" />
              <p className="relative text-sm font-bold uppercase tracking-wide text-forest-700">Estimated climate impact</p>
              <p className="relative mt-3 text-sm text-slate-600">Equivalent to planting approximately</p>
              <AnimatedNumber value={overview.climate.equivalentTrees} format={(value) => formatNumber(Math.round(value))} className="relative block text-4xl font-extrabold text-forest-900" />
              <p className="relative text-sm font-semibold text-slate-700">trees</p>
              <p className="relative mt-4 flex gap-1.5 text-[11px] leading-relaxed text-slate-500">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>
                  {overview.climate.methodology.label}: grid factor {overview.climate.methodology.gridEmissionFactorKgPerKWh} kg CO₂/kWh and{' '}
                  {overview.climate.methodology.kgCO2PerTreePerYear} kg CO₂ per tree per year. {overview.climate.methodology.note}
                </span>
              </p>
            </Card>
          </section>

          <section aria-label="Climate KPIs" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard index={0} label="Systems live" value={overview.climate.systemsLive} format={(value) => formatNumber(Math.round(value))} icon={Leaf} change={overview.climate.change.systemsLive} accent="green" />
            <KpiCard index={1} label="Installed capacity" value={overview.climate.installedKW} format={(value) => formatCapacity(Math.round(value))} icon={TreePine} change={overview.climate.change.installedKW} accent="yellow" />
            <KpiCard index={2} label="Estimated annual generation" value={overview.climate.estAnnualMWh} format={(value) => `${formatNumber(Math.round(value))} MWh`} icon={Info} accent="sky" />
            <KpiCard index={3} label="Subsidy credited" value={overview.subsidy.credited.amountINR} format={formatINRCompact} icon={TreePine} change={overview.subsidy.change.creditedAmountINR} accent="emerald" footnote={`${overview.subsidy.credited.count} credits in period`} />
          </section>
        </>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Solar installations over time" subtitle="Monthly installations in the filtered book">
          {data ? <InstallationsChart data={data.monthly} /> : <Skeleton className="h-full w-full" />}
        </ChartCard>
        <ChartCard title="Regional adoption" subtitle="Top states by applications in scope">
          {data ? <RegionalAdoptionChart data={data.regional} /> : <Skeleton className="h-full w-full" />}
        </ChartCard>
        <ChartCard title="CO₂ offset growth" subtitle="Cumulative estimated tonnes avoided (demo emission factor)">
          {data ? <CO2GrowthChart data={data.monthly} /> : <Skeleton className="h-full w-full" />}
        </ChartCard>
        <ChartCard title="Green loan disbursement" subtitle="Monthly and cumulative (₹ lakh)">
          {data ? <LoanDisbursementChart data={data.monthly} /> : <Skeleton className="h-full w-full" />}
        </ChartCard>
      </div>

      {data && (
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 p-5 pb-3">
            <div>
              <h2 className="font-bold text-slate-900">State breakdown</h2>
              <p className="text-xs text-slate-500">All 36 states and union territories, including those with no applications in scope.</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-5 py-3">State / UT</th>
                  <th scope="col" className="px-5 py-3">Applications</th>
                  <th scope="col" className="px-5 py-3">Systems live</th>
                  <th scope="col" className="px-5 py-3">Capacity</th>
                  <th scope="col" className="px-5 py-3">CO₂ avoided</th>
                  <th scope="col" className="px-5 py-3">Loans disbursed</th>
                  <th scope="col" className="px-5 py-3">Subsidy credited</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...data.regional]
                  .sort((a, b) => b.applications - a.applications || a.state.localeCompare(b.state))
                  .map((row) => (
                    <tr key={row.code} className={row.applications === 0 ? 'text-slate-400' : 'hover:bg-slate-50/70'}>
                      <td className="px-5 py-3 font-semibold text-slate-800">
                        {row.state}
                        <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500">{row.type === 'ut' ? 'UT' : row.code}</span>
                      </td>
                      <td className="px-5 py-3 tabular-nums">{formatNumber(row.applications)}</td>
                      <td className="px-5 py-3 tabular-nums">{formatNumber(row.systemsLive)}</td>
                      <td className="px-5 py-3 tabular-nums">{formatCapacity(row.capacityKW)}</td>
                      <td className="px-5 py-3 tabular-nums">{formatNumber(row.co2Tonnes)} t</td>
                      <td className="px-5 py-3 tabular-nums">{formatINRCompact(row.loansINR)}</td>
                      <td className="px-5 py-3 tabular-nums">{formatINRCompact(row.subsidyCreditedINR)}</td>
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
