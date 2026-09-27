import { ArrowRight, Banknote, CalendarDays, CloudOff, Home, RefreshCw, SolarPanel, TreePine } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ImpactStory } from '@/components/admin/ImpactStory';
import { KpiCard } from '@/components/admin/KpiCard';
import { LeadsManager } from '@/components/admin/LeadsManager';
import { PageHeader } from '@/components/admin/PageHeader';
import { ChartCard } from '@/components/charts/ChartCard';
import { InstallationsChart } from '@/components/charts/InstallationsChart';
import { RegionalAdoptionChart } from '@/components/charts/RegionalAdoptionChart';
import { ErrorState } from '@/components/shared/States';
import { Button, buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { formatCapacity, formatINRCompact, formatNumber } from '@/utils/format';

export function DashboardPage() {
  useDocumentTitle('Dashboard');
  const analytics = useAnalytics();
  const data = analytics.data;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
            <CalendarDays className="h-3.5 w-3.5 text-forest-600" aria-hidden="true" /> {data?.overview.asOf ?? 'September 2026'}
          </span>
        }
        title="Clean Energy Transition Dashboard"
        subtitle="Monitor solar adoption, green financing, and climate impact across communities."
        actions={
          <Button variant="outline" size="sm" onClick={analytics.reload} loading={analytics.loading}>
            {!analytics.loading && <RefreshCw className="h-4 w-4" aria-hidden="true" />} Refresh
          </Button>
        }
      />

      {analytics.error && <ErrorState message={analytics.error} onRetry={analytics.reload} />}

      <section aria-label="Key metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {!data
          ? [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-3xl" />)
          : (
            <>
              <KpiCard index={0} label="Households Transitioned" value={data.overview.households} format={(v) => formatNumber(Math.round(v))} icon={Home} change={data.overview.change.households} accent="green" />
              <KpiCard index={1} label="Clean Energy Capacity" value={data.overview.capacityKW} format={(v) => formatCapacity(Math.round(v))} icon={SolarPanel} change={data.overview.change.capacityKW} accent="yellow" />
              <KpiCard index={2} label="CO₂ Offset (est.)" value={data.overview.co2OffsetTonnes} format={(v) => `${formatNumber(Math.round(v))} Tons`} icon={CloudOff} change={data.overview.change.co2OffsetTonnes} accent="sky" />
              <KpiCard index={3} label="Green Loans Disbursed" value={data.overview.loansDisbursedINR} format={formatINRCompact} icon={Banknote} change={data.overview.change.loansDisbursedINR} accent="emerald" />
            </>
          )}
      </section>

      {data && (
        <section className="rounded-3xl bg-gradient-to-br from-forest-900 to-forest-950 p-5 sm:p-6" aria-labelledby="story-title">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 id="story-title" className="font-bold text-white">
              The transition story
            </h2>
            <p className="flex items-center gap-1.5 text-xs text-forest-200">
              <TreePine className="h-4 w-4 text-solar-300" aria-hidden="true" />
              ≈ {formatNumber(data.overview.equivalentTrees)} trees equivalent (estimate)
            </p>
          </div>
          <ImpactStory overview={data.overview} />
        </section>
      )}

      <div className="grid gap-4 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <ChartCard title="Solar installations over time" subtitle="Monthly installations, 2026">
            {data ? <InstallationsChart data={data.monthly} /> : <Skeleton className="h-full w-full" />}
          </ChartCard>
        </div>
        <div className="xl:col-span-2">
          <ChartCard title="Regional adoption" subtitle="Households transitioned by state">
            {data ? <RegionalAdoptionChart data={data.regional} /> : <Skeleton className="h-full w-full" />}
          </ChartCard>
        </div>
      </div>

      <section aria-labelledby="recent-title" className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 id="recent-title" className="text-lg font-bold text-slate-900">
              Latest applications
            </h2>
            {data && (
              <p className="text-sm text-slate-500">
                {data.overview.pipeline.pending} pending verification · {data.overview.pipeline.total} in pipeline
              </p>
            )}
          </div>
          <Link to="/admin/leads" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
            All leads <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <LeadsManager compact pageSize={5} onStatusChanged={analytics.reload} />
      </section>
    </div>
  );
}
