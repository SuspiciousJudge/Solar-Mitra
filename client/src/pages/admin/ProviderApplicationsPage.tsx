import { Download } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/admin/PageHeader';
import { EmptyState, ErrorState } from '@/components/shared/States';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { INDIA_REGIONS } from '@/data/indiaRegions';
import { useAsync } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { TOKEN_STORAGE_KEY } from '@/services/api';
import { fetchProviderApplications, fetchProviderStats } from '@/services/providerService';
import { BUSINESS_TYPES, PROVIDER_STATUSES } from '@/utils/providerRules';

export function ProviderApplicationsPage() {
  useDocumentTitle('Provider onboarding');
  const [params, setParams] = useSearchParams();
  const query = useMemo(
    () => ({
      status: params.get('status') ?? undefined,
      state: params.get('state') ?? undefined,
      businessType: params.get('businessType') ?? undefined,
      search: params.get('search') ?? undefined,
      discomEmpanelled: params.get('discomEmpanelled') ?? undefined,
      hasRiskFlags: params.get('hasRiskFlags') ?? undefined,
      page: Number(params.get('page') ?? 1),
      limit: 20,
      sortBy: params.get('sortBy') ?? 'submittedAt',
    }),
    [params],
  );
  const list = useAsync(() => fetchProviderApplications(query), [params.toString()]);
  const stats = useAsync(() => fetchProviderStats(), []);

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page');
    setParams(next, { replace: true });
  };

  const exportCsv = async () => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    const search = params.toString();
    const response = await fetch(`/api/operator/provider-applications/export.csv${search ? `?${search}` : ''}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'provider-applications.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const kpis = [
    ['Submitted', stats.data?.submitted ?? 0],
    ['Under review', stats.data?.underReview ?? 0],
    ['Changes requested', stats.data?.changesRequested ?? 0],
    ['Approved this month', stats.data?.approvedThisMonth ?? 0],
    ['Rejected', stats.data?.rejected ?? 0],
    ['Avg review (h)', stats.data?.avgReviewHours ?? 0],
    ['Pending > 72h', stats.data?.pendingOver72h ?? 0],
  ] as const;

  return (
    <>
      <PageHeader
        title="Provider onboarding"
        subtitle="Review installer applications before they appear in the household vendor list."
        actions={
          <Button variant="outline" onClick={() => void exportCsv()}>
            <Download className="h-4 w-4" aria-hidden="true" /> CSV export
          </Button>
        }
      />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {kpis.map(([label, value]) => (
          <Card key={label} className="p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-extrabold tabular-nums">{value}</p>
          </Card>
        ))}
      </div>
      <Card className="overflow-hidden">
        <div className="grid gap-3 border-b border-slate-100 p-4 md:grid-cols-3 lg:grid-cols-6">
          <Input placeholder="Search name / GSTIN / app no." value={query.search ?? ''} onChange={(e) => set('search', e.target.value)} />
          <Select aria-label="Status" value={query.status ?? ''} onChange={(e) => set('status', e.target.value)}>
            <option value="">All statuses</option>
            {PROVIDER_STATUSES.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </Select>
          <Select aria-label="State" value={query.state ?? ''} onChange={(e) => set('state', e.target.value)}>
            <option value="">All states</option>
            {INDIA_REGIONS.map((region) => (
              <option key={region.code} value={region.name}>{region.name}</option>
            ))}
          </Select>
          <Select aria-label="Business type" value={query.businessType ?? ''} onChange={(e) => set('businessType', e.target.value)}>
            <option value="">All types</option>
            {BUSINESS_TYPES.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </Select>
          <Select aria-label="DISCOM" value={query.discomEmpanelled ?? ''} onChange={(e) => set('discomEmpanelled', e.target.value)}>
            <option value="">DISCOM any</option>
            <option value="true">Empanelled</option>
            <option value="false">Not empanelled</option>
          </Select>
          <Select aria-label="Risk flags" value={query.hasRiskFlags ?? ''} onChange={(e) => set('hasRiskFlags', e.target.value)}>
            <option value="">Risk any</option>
            <option value="true">Has risk flags</option>
            <option value="false">No risk flags</option>
          </Select>
        </div>
        {list.error ? (
          <div className="p-6"><ErrorState message={list.error} onRetry={list.reload} /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  {['App no.', 'Business', 'Type', 'State', 'Years', 'Exp.', 'Installs', 'DISCOM', '%', 'Risk', 'Status', 'Submitted', ''].map((heading) => (
                    <th key={heading || 'a'} className="px-3 py-3">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.loading
                  ? Array.from({ length: 6 }).map((_, index) => (
                      <tr key={index}><td colSpan={13} className="px-3 py-3"><Skeleton className="h-8 w-full" /></td></tr>
                    ))
                  : (list.data?.items ?? []).map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/80">
                        <td className="px-3 py-3 font-mono text-xs">{row.id}</td>
                        <td className="px-3 py-3">
                          <p className="font-semibold">{row.legalName}</p>
                          <p className="text-xs text-slate-500">{row.proprietor}</p>
                        </td>
                        <td className="px-3 py-3">{row.businessType}</td>
                        <td className="px-3 py-3">{row.district ? `${row.district}, ${row.state}` : row.state}</td>
                        <td className="px-3 py-3 tabular-nums">{row.yearsInBusiness ?? '—'}</td>
                        <td className="px-3 py-3 tabular-nums">{row.yearsExperience ?? '—'}</td>
                        <td className="px-3 py-3 tabular-nums">{row.totalInstallations ?? '—'}</td>
                        <td className="px-3 py-3">{row.discomEmpanelled ? '✓' : '✗'}</td>
                        <td className="px-3 py-3 tabular-nums">{row.completeness}</td>
                        <td className="px-3 py-3">{row.riskFlagCount > 0 ? <Badge variant="yellow">{row.riskFlagCount}</Badge> : '—'}</td>
                        <td className="px-3 py-3"><Badge>{row.status}</Badge></td>
                        <td className="px-3 py-3 text-xs">{row.submittedAt ? new Date(row.submittedAt).toLocaleDateString() : '—'}</td>
                        <td className="px-3 py-3 text-right">
                          <Link to={`/admin/providers/applications/${row.id}`} className="text-sm font-semibold text-forest-700 hover:underline">
                            Review
                          </Link>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
            {!list.loading && (list.data?.items.length ?? 0) === 0 && (
              <div className="p-6"><EmptyState title="No applications" description="Try clearing filters." /></div>
            )}
          </div>
        )}
      </Card>
    </>
  );
}
