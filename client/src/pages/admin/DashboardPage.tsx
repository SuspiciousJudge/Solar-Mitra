import { AlertTriangle, Banknote, CalendarClock, CloudOff, Download, Home, IndianRupee, Landmark, PiggyBank, SolarPanel, Timer, Users, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FilterBar } from '@/components/admin/FilterBar';
import { ImpactStory } from '@/components/admin/ImpactStory';
import { KpiCard } from '@/components/admin/KpiCard';
import { LeadsManager } from '@/components/admin/LeadsManager';
import { PageHeader } from '@/components/admin/PageHeader';
import { ChartCard } from '@/components/charts/ChartCard';
import { FunnelChart } from '@/components/charts/FunnelChart';
import { InstallationsChart } from '@/components/charts/InstallationsChart';
import { RegionalAdoptionChart } from '@/components/charts/RegionalAdoptionChart';
import { ErrorState } from '@/components/shared/States';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useOperatorFilters } from '@/hooks/useOperatorFilters';
import { leadsExportUrl } from '@/services/leadService';
import { formatCapacity, formatINR, formatINRCompact, formatNumber } from '@/utils/format';

const hours = (value: number | null) => (value === null ? '—' : value >= 48 ? `${(value / 24).toFixed(1)} d` : `${value.toFixed(1)} h`);

export function DashboardPage() {
  useDocumentTitle('Dashboard');
  const filters = useOperatorFilters();
  const analytics = useAnalytics(filters.queryParams);
  const data = analytics.data;
  const overview = data?.overview;

  const exportLeads = () => {
    window.location.href = leadsExportUrl(filters.filters);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clean Energy Transition Dashboard"
        subtitle="Every number below is aggregated live from applications, audit-trail events and transactions — filter once and the whole page follows."
      />

      <FilterBar api={filters} asOf={overview?.asOf} onExport={exportLeads} exportLabel="Export leads" onRefresh={analytics.reload} refreshing={analytics.loading} />

      {analytics.error && <ErrorState message={analytics.error} onRetry={analytics.reload} />}

      <section aria-label="Climate and finance KPIs" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {!overview
          ? [0, 1, 2, 3].map((index) => <Skeleton key={index} className="h-40 rounded-3xl" />)
          : (
            <>
              <KpiCard
                index={0}
                label="Households generating solar"
                value={overview.climate.systemsLive}
                format={(value) => formatNumber(Math.round(value))}
                icon={Home}
                change={overview.climate.change.systemsLive}
                accent="green"
                footnote={`${overview.pipeline.live} live systems in the filtered book`}
              />
              <KpiCard
                index={1}
                label="Clean energy capacity"
                value={overview.climate.installedKW}
                format={(value) => formatCapacity(Math.round(value))}
                icon={SolarPanel}
                change={overview.climate.change.installedKW}
                accent="yellow"
                footnote={`${formatNumber(overview.climate.estAnnualMWh)} MWh estimated per year`}
              />
              <KpiCard
                index={2}
                label="CO₂ avoided (est.)"
                value={overview.climate.co2AvoidedTonnes}
                format={(value) => `${formatNumber(Math.round(value))} t`}
                icon={CloudOff}
                change={overview.climate.change.co2AvoidedTonnes}
                accent="sky"
                footnote={`≈ ${formatNumber(overview.climate.equivalentTrees)} trees per year`}
              />
              <KpiCard
                index={3}
                label="Green loans disbursed"
                value={overview.finance.disbursed.amountINR}
                format={formatINRCompact}
                icon={Banknote}
                change={overview.finance.change.disbursedAmountINR}
                accent="emerald"
                footnote={`${overview.finance.disbursed.count} disbursements · avg ${formatINRCompact(overview.finance.avgTicketINR)}`}
              />
            </>
          )}
      </section>

      {overview && (
        <section className="rounded-3xl bg-gradient-to-br from-forest-900 to-forest-950 p-5 sm:p-6" aria-labelledby="story-title">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 id="story-title" className="font-bold text-white">
              The transition story
            </h2>
            <p className="flex items-center gap-1.5 text-xs text-forest-200">
              <Zap className="h-4 w-4 text-solar-300" aria-hidden="true" />
              {overview.period.label} · {overview.dataPoints.applications.toLocaleString('en-IN')} applications in scope
            </p>
          </div>
          <ImpactStory overview={overview} />
        </section>
      )}

      <section aria-label="Operations and money" className="grid gap-4 lg:grid-cols-3">
        {!overview
          ? [0, 1, 2].map((index) => <Skeleton key={index} className="h-56 rounded-3xl" />)
          : (
            <>
              <Card className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 font-bold text-slate-900">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-solar-50 text-solar-700">
                      <Timer className="h-4 w-4" aria-hidden="true" />
                    </span>
                    Queue health
                  </h2>
                  <Badge variant={overview.operations.slaBreachedCount > 0 ? 'red' : 'green'}>{overview.operations.pendingQueue} pending</Badge>
                </div>
                <dl className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-500">Oldest waiting file</dt>
                    <dd className="font-bold tabular-nums text-slate-900">{overview.operations.oldestWaitingLabel}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-500">48h SLA breached</dt>
                    <dd className={`font-bold tabular-nums ${overview.operations.slaBreachedCount > 0 ? 'text-red-600' : 'text-forest-700'}`}>{overview.operations.slaBreachedCount}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-500">Approval rate (period)</dt>
                    <dd className="font-bold tabular-nums text-slate-900">{overview.operations.approvalRatePercent}%</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-500">Median time to decision</dt>
                    <dd className="font-bold tabular-nums text-slate-900">{hours(overview.operations.medianTimeToDecisionHours)}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-500">Median approval → install</dt>
                    <dd className="font-bold tabular-nums text-slate-900">{hours(overview.operations.medianTimeToInstallHours)}</dd>
                  </div>
                </dl>
                {overview.operations.slaBreachedCount > 0 && (
                  <p className="mt-4 flex items-start gap-2 rounded-2xl bg-red-50 p-3 text-xs font-semibold text-red-700">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {overview.operations.slaBreachedCount} file{overview.operations.slaBreachedCount === 1 ? '' : 's'} older than 48h need an operator decision.
                  </p>
                )}
              </Card>

              <Card className="p-5">
                <h2 className="mb-4 flex items-center gap-2 font-bold text-slate-900">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-forest-50 text-forest-700">
                    <IndianRupee className="h-4 w-4" aria-hidden="true" />
                  </span>
                  Money movement
                </h2>
                <dl className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-500">Subsidy claimed</dt>
                    <dd className="font-bold tabular-nums text-slate-900">
                      {formatINRCompact(overview.subsidy.claimed.amountINR)} <span className="font-medium text-slate-500">({overview.subsidy.claimed.count})</span>
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-500">Subsidy credited</dt>
                    <dd className="font-bold tabular-nums text-forest-700">
                      {formatINRCompact(overview.subsidy.credited.amountINR)} <span className="font-medium text-slate-500">({overview.subsidy.credited.count})</span>
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-500">Install → credit</dt>
                    <dd className="font-bold tabular-nums text-slate-900">
                      {overview.subsidy.avgDaysInstallToCredit === null ? '—' : `${overview.subsidy.avgDaysInstallToCredit.toFixed(1)} days`}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-500">Household savings</dt>
                    <dd className="font-bold tabular-nums text-slate-900">{formatINRCompact(overview.subsidy.householdSavings.monthlyINR)}/mo</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-500">Money in / out (period)</dt>
                    <dd className="font-bold tabular-nums text-slate-900">
                      {formatINRCompact(overview.moneyFlow.inflowINR)} / {formatINRCompact(overview.moneyFlow.outflowINR)}
                    </dd>
                  </div>
                </dl>
                <Link to="/admin/money-flow" className={buttonVariants({ variant: 'outline', size: 'sm', className: 'mt-4 w-full' })}>
                  Open money-flow ledger
                </Link>
              </Card>

              <Card className="p-5">
                <h2 className="mb-4 flex items-center gap-2 font-bold text-slate-900">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                    <Landmark className="h-4 w-4" aria-hidden="true" />
                  </span>
                  Loan book
                </h2>
                <dl className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-500">Sanctioned (period)</dt>
                    <dd className="font-bold tabular-nums text-slate-900">
                      {formatINRCompact(overview.finance.sanctioned.amountINR)} <span className="font-medium text-slate-500">({overview.finance.sanctioned.count})</span>
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-500">Disbursed (period)</dt>
                    <dd className="font-bold tabular-nums text-slate-900">
                      {formatINRCompact(overview.finance.disbursed.amountINR)} <span className="font-medium text-slate-500">({overview.finance.disbursed.count})</span>
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-500">Financed share of new files</dt>
                    <dd className="font-bold tabular-nums text-slate-900">{overview.finance.financedSharePercent}%</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-500">Outstanding principal</dt>
                    <dd className="font-bold tabular-nums text-slate-900">{formatINRCompact(overview.finance.outstandingPrincipalINR)}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-500">On-time EMI / 30+ DPD</dt>
                    <dd className="font-bold tabular-nums text-slate-900">
                      {overview.finance.repayment.onTimePercent}% / <span className={overview.finance.repayment.dpd30PlusPercent > 10 ? 'text-red-600' : undefined}>{overview.finance.repayment.dpd30PlusPercent}%</span>
                    </dd>
                  </div>
                </dl>
              </Card>
            </>
          )}
      </section>

      <div className="grid gap-4 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <ChartCard title="Solar installations over time" subtitle={overview ? `${overview.period.label} · monthly capacity added` : 'Monthly installations'}>
            {data ? <InstallationsChart data={data.monthly} /> : <Skeleton className="h-full w-full" />}
          </ChartCard>
        </div>
        <div className="xl:col-span-2">
          <ChartCard title="Regional adoption" subtitle="Top states by applications in scope">
            {data ? <RegionalAdoptionChart data={data.regional} /> : <Skeleton className="h-full w-full" />}
          </ChartCard>
        </div>
        <div className="xl:col-span-2">
          <ChartCard title="Funnel: audits to subsidy" subtitle="Applications created in the selected period, by milestone reached">
            {data ? (
              <>
                <FunnelChart data={data.funnel} />
                <p className="mt-2 text-xs text-slate-500">
                  Loan branch: {data.overview.operations.loanBranch.disbursed} of {data.overview.operations.loanBranch.financedApplications} financed files disbursed
                  {data.overview.operations.loanBranch.conversionFromFinanced !== null ? ` (${data.overview.operations.loanBranch.conversionFromFinanced}%)` : ''} · upfront households skip the loan steps.
                </p>
              </>
            ) : (
              <Skeleton className="h-full w-full" />
            )}
          </ChartCard>
        </div>
        <div className="xl:col-span-3">
          <Card className="p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-bold text-slate-900">Subsidy &amp; savings</h2>
                <p className="text-xs text-slate-500">Claim → credit timeline for the filtered book</p>
              </div>
              <PiggyBank className="h-5 w-5 text-forest-600" aria-hidden="true" />
            </div>
            {!overview ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-forest-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-forest-700">Monthly household savings</p>
                  <p className="mt-1 text-2xl font-extrabold tabular-nums text-forest-900">{formatINR(overview.subsidy.householdSavings.monthlyINR)}</p>
                  <p className="mt-1 text-xs text-forest-700">avg {formatINR(overview.subsidy.householdSavings.avgMonthlyPerHouseholdINR)} per household</p>
                </div>
                <div className="rounded-2xl bg-solar-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-solar-800">Cumulative savings since commissioning</p>
                  <p className="mt-1 text-2xl font-extrabold tabular-nums text-slate-900">{formatINRCompact(overview.subsidy.householdSavings.cumulativeINR)}</p>
                  <p className="mt-1 text-xs text-slate-600">estimated from demo tariff assumptions</p>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pipeline</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {overview.pipeline.total.toLocaleString('en-IN')} applications · {overview.pipeline.pending} pending · {overview.pipeline.live} live
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Decisions in period</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {overview.operations.decided.approved} approved · {overview.operations.decided.rejected} rejected
                  </p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      <section aria-labelledby="recent-title" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 id="recent-title" className="text-lg font-bold text-slate-900">
              Applications in scope
            </h2>
            <p className="text-sm text-slate-500">
              {overview ? `${overview.pipeline.pending} pending verification · ${overview.pipeline.total} matched by the current filters` : 'Loading the filtered book…'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/admin/leads" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
              Open leads <Users className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link to="/admin/money-flow" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
              Money flow <CalendarClock className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Button variant="outline" size="sm" onClick={exportLeads}>
              <Download className="h-4 w-4" aria-hidden="true" /> CSV
            </Button>
          </div>
        </div>
        <LeadsManager compact pageSize={5} filters={filters} onStatusChanged={analytics.reload} />
      </section>
    </div>
  );
}
