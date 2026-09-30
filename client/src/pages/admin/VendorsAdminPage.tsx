import { BadgeCheck, Eye, FilterX, Search, ShieldCheck, Star } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { PageHeader } from '@/components/admin/PageHeader';
import { EmptyState, ErrorState } from '@/components/shared/States';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Input, Select } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { STATES } from '@/data/states';
import { useAsync } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { getErrorMessage } from '@/services/api';
import { reinstateProvider, suspendProvider } from '@/services/providerService';
import { fetchVendors, setVendorActive } from '@/services/vendorService';
import type { Vendor } from '@/types';
import { cn } from '@/utils/cn';

function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: () => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={cn('relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50', checked ? 'bg-forest-600' : 'bg-slate-300')}
    >
      <span className={cn('inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform', checked ? 'translate-x-[22px]' : 'translate-x-0.5')} />
    </button>
  );
}

export function VendorsAdminPage() {
  useDocumentTitle('Vendors');
  const query = useAsync(() => fetchVendors(), []);
  const [search, setSearch] = useState('');
  const [state, setState] = useState('');
  const [verification, setVerification] = useState<'' | 'empanelled' | 'not-empanelled'>('');
  const [viewing, setViewing] = useState<Vendor | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [reason, setReason] = useState('Quality pause');

  const vendors = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (query.data?.vendors ?? []).filter(
      (v) =>
        (!term || `${v.name} ${v.location}`.toLowerCase().includes(term)) &&
        (!state || v.state === state) &&
        (!verification || (verification === 'empanelled' ? v.empanelled : !v.empanelled)),
    );
  }, [query.data, search, state, verification]);

  const setLocalActive = (id: string, active: boolean) =>
    query.setData((prev) => (prev ? { ...prev, vendors: prev.vendors.map((v) => (v.id === id ? { ...v, active } : v)) } : prev));

  const toggle = async (vendor: Vendor) => {
    const next = !vendor.active;
    setLocalActive(vendor.id, next);
    setTogglingId(vendor.id);
    try {
      await setVendorActive(vendor.id, next);
      toast.success(`${vendor.name} ${next ? 'enabled' : 'disabled'}`);
    } catch (error) {
      setLocalActive(vendor.id, vendor.active);
      toast.error(getErrorMessage(error, 'Could not update the vendor.'));
    } finally {
      setTogglingId(null);
    }
  };

  const hasFilters = Boolean(search || state || verification);

  return (
    <>
      <PageHeader title="Vendor network" subtitle="Manage verified installation partners. Disabled vendors are hidden from households." />
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center">
          <div className="flex-1">
            <label htmlFor="vendor-search" className="sr-only">Search vendors</label>
            <Input id="vendor-search" placeholder="Search vendors or locations" prefix={<Search className="h-4 w-4" aria-hidden="true" />} className="h-11 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:flex">
            <Select aria-label="Filter by state" className="h-11 text-sm sm:w-44" value={state} onChange={(e) => setState(e.target.value)}>
              <option value="">All states</option>
              {STATES.filter((s) => s !== 'Other').map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
            <Select aria-label="Filter by verification" className="h-11 text-sm sm:w-48" value={verification} onChange={(e) => setVerification(e.target.value as typeof verification)}>
              <option value="">All verification</option>
              <option value="empanelled">MNRE empanelled</option>
              <option value="not-empanelled">Not empanelled</option>
            </Select>
          </div>
          <Button variant="ghost" size="sm" className="h-11" disabled={!hasFilters} onClick={() => { setSearch(''); setState(''); setVerification(''); }}>
            <FilterX className="h-4 w-4" aria-hidden="true" /> Clear filters
          </Button>
        </div>

        {query.error ? (
          <div className="p-6"><ErrorState message={query.error} onRetry={query.reload} /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  {['Vendor', 'Location', 'Source', 'Rating', 'Installations', 'Verification', 'Active', ''].map((h) => (
                    <th key={h || 'actions'} scope="col" className="px-4 py-3">{h || <span className="sr-only">Actions</span>}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {query.loading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}><td colSpan={8} className="px-4 py-3"><Skeleton className="h-8 w-full" /></td></tr>
                    ))
                  : vendors.map((vendor) => (
                      <tr key={vendor.id} className={cn('hover:bg-slate-50/70', !vendor.active && 'opacity-60')}>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-900">{vendor.name}</p>
                          <p className="font-mono text-xs text-slate-400">{vendor.id}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{vendor.location}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            <Badge variant="outline">{vendor.source === 'onboarded' ? 'Onboarded' : 'Seeded'}</Badge>
                            {vendor.tier && <Badge variant="blue">{vendor.tier}</Badge>}
                            {vendor.licenceExpiry && new Date(vendor.licenceExpiry).getTime() - Date.now() < 90 * 86400000 && (
                              <Badge variant="yellow">Licence</Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 font-semibold"><Star className="h-4 w-4 fill-solar-400 text-solar-400" aria-hidden="true" />{vendor.rating.toFixed(1)}</span>
                        </td>
                        <td className="px-4 py-3 tabular-nums">{vendor.installations}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            {vendor.empanelled ? <Badge variant="green"><ShieldCheck className="h-3 w-3" aria-hidden="true" />MNRE</Badge> : <Badge variant="red">Not empanelled</Badge>}
                            {vendor.verified && <Badge variant="blue"><BadgeCheck className="h-3 w-3" aria-hidden="true" />Verified</Badge>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Switch checked={vendor.active} onChange={() => toggle(vendor)} disabled={togglingId === vendor.id} label={`${vendor.active ? 'Disable' : 'Enable'} ${vendor.name}`} />
                            <span className="text-xs font-semibold text-slate-500">{vendor.active ? 'Active' : 'Disabled'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button variant="ghost" size="sm" onClick={() => setViewing(vendor)} aria-label={`View ${vendor.name}`}>
                            <Eye className="h-4 w-4" aria-hidden="true" /> View
                          </Button>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
            {!query.loading && vendors.length === 0 && (
              <div className="p-6"><EmptyState title="No vendors found" description="Try a different search or clear the filters." /></div>
            )}
          </div>
        )}
      </Card>

      <Dialog open={viewing !== null} onClose={() => setViewing(null)} title={viewing?.name ?? ''} description={viewing?.location}>
        {viewing && (
          <dl className="grid grid-cols-2 gap-3 text-sm">
            {[
              ['Vendor ID', viewing.id],
              ['Rating', `${viewing.rating.toFixed(1)} / 5`],
              ['Installations', viewing.installations],
              ['Years in business', viewing.yearsInBusiness],
              ['Distance (demo)', `${viewing.distanceKm} km`],
              ['Phone', viewing.phone],
              ['MNRE empanelled', viewing.empanelled ? 'Yes' : 'No'],
              ['Status', viewing.active ? 'Active' : 'Disabled'],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-2xl bg-slate-50 p-3">
                <dt className="text-xs font-semibold uppercase text-slate-500">{label}</dt>
                <dd className="mt-0.5 font-semibold text-slate-900">{value}</dd>
              </div>
            ))}
            <div className="col-span-2 rounded-2xl bg-slate-50 p-3">
              <dt className="text-xs font-semibold uppercase text-slate-500">Specialities</dt>
              <dd className="mt-0.5 font-semibold text-slate-900">{viewing.specialities.join(' · ') || '—'}</dd>
            </div>
            {viewing.providerApplicationId && (
              <Link to={`/admin/providers/applications/${viewing.providerApplicationId}`} className="col-span-2 text-sm font-semibold text-forest-700">
                Open original application
              </Link>
            )}
            <div className="col-span-2 space-y-2">
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason" />
              {viewing.active ? (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={async () => {
                    try {
                      await suspendProvider(viewing.id, reason);
                      toast.success('Partner suspended');
                      query.reload();
                    } catch (error) {
                      toast.error(getErrorMessage(error));
                    }
                  }}
                >
                  Suspend
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={async () => {
                    try {
                      await reinstateProvider(viewing.id, reason);
                      toast.success('Partner reinstated');
                      query.reload();
                    } catch (error) {
                      toast.error(getErrorMessage(error));
                    }
                  }}
                >
                  Reinstate
                </Button>
              )}
            </div>
          </dl>
        )}
      </Dialog>
    </>
  );
}
