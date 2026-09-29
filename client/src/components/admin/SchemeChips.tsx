import { BadgeIndianRupee, CircleHelp, Landmark } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { useAsync } from '@/hooks/useAsync';
import { fetchSchemeCatalogue } from '@/services/schemeService';
import type { SubsidyScheme } from '@/types';
import { cn } from '@/utils/cn';

let catalogueCache: SubsidyScheme[] | null = null;

/** Fetches the scheme catalogue once per session — it only changes with a release. */
function useSchemeCatalogue() {
  return useAsync(async () => {
    if (catalogueCache) return catalogueCache;
    const catalogue = await fetchSchemeCatalogue();
    catalogueCache = catalogue.schemes;
    return catalogueCache;
  }, []);
}

interface SchemeChipsProps {
  schemeIds: string[];
  /** Hides the "why this scheme" dialog trigger on dense tables. */
  interactive?: boolean;
  className?: string;
}

/**
 * Shows which subsidy schemes an application is stacked under. Every amount in
 * the product is traceable back to a named scheme, not a hard-coded number.
 */
export function SchemeChips({ schemeIds, interactive = true, className }: SchemeChipsProps) {
  const query = useSchemeCatalogue();
  const [open, setOpen] = useState<SubsidyScheme | null>(null);
  const schemes = (query.data ?? []).filter((scheme) => schemeIds.includes(scheme.id));

  if (query.loading || schemes.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {schemes.map((scheme) => (
        <Badge
          key={scheme.id}
          variant={scheme.state ? 'yellow' : 'green'}
          className={interactive ? 'cursor-pointer' : undefined}
          {...(interactive
            ? {
                onClick: () => setOpen(scheme),
                role: 'button',
                tabIndex: 0,
                onKeyDown: (event: React.KeyboardEvent) => {
                  if (event.key === 'Enter' || event.key === ' ') setOpen(scheme);
                },
                title: `View ${scheme.name}`,
              }
            : { title: scheme.name })}
        >
          {scheme.state ? <Landmark className="h-3 w-3" aria-hidden="true" /> : <BadgeIndianRupee className="h-3 w-3" aria-hidden="true" />}
          {scheme.shortName}
          {interactive && <CircleHelp className="h-3 w-3 opacity-60" aria-hidden="true" />}
        </Badge>
      ))}

      <Dialog open={open !== null} onClose={() => setOpen(null)} title={open?.name ?? ''} description={open ? `${open.level === 'central' ? 'Central scheme' : `State scheme · ${open.state}`} · verified ${open.lastVerified}` : ''}>
        {open && (
          <div className="space-y-4 text-sm">
            <p className="rounded-2xl bg-forest-50 px-3 py-2 font-semibold text-forest-900">
              {open.calcDescription}
              {open.specialCategoryCalcDescription && <span className="block text-xs font-medium text-forest-700">Special category: {open.specialCategoryCalcDescription}</span>}
            </p>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Eligibility</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-700">
                {open.eligibility.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">How the money reaches the household</p>
              <p className="mt-1 text-slate-700">{open.disbursementRoute}</p>
            </div>
            <p className="rounded-2xl bg-solar-50 px-3 py-2 text-xs font-semibold text-solar-900">{open.disclaimer}</p>
            {open.officialUrl && (
              <a className="text-xs font-semibold text-forest-700 underline" href={open.officialUrl} target="_blank" rel="noreferrer">
                Official source
              </a>
            )}
          </div>
        )}
      </Dialog>
    </div>
  );
}
