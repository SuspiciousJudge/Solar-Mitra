import { motion } from 'framer-motion';
import { BadgeCheck, CircleCheck, MapPin, ShieldCheck, Star, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/context/LanguageContext';
import type { Vendor } from '@/types';
import { cn } from '@/utils/cn';

interface VendorCardProps {
  vendor: Vendor;
  selected: boolean;
  index: number;
  onSelect: () => void;
  onViewDetails: () => void;
}

export function Rating({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-1" aria-label={`Rated ${value} out of 5`}>
      <span className="flex" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star key={star} className={cn('h-4 w-4', star <= Math.round(value) ? 'fill-solar-400 text-solar-400' : 'text-slate-300')} />
        ))}
      </span>
      <span className="text-sm font-bold text-slate-900" aria-hidden="true">
        {value.toFixed(1)}
      </span>
    </span>
  );
}

export function VendorCard({ vendor, selected, index, onSelect, onViewDetails }: VendorCardProps) {
  const { t } = useLanguage();
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 * index }}
      className={cn(
        'relative rounded-3xl border-2 bg-white p-4 shadow-soft transition-colors',
        selected ? 'border-forest-600 ring-4 ring-forest-600/10' : 'border-transparent',
      )}
      aria-label={vendor.name}
    >
      {selected && (
        <span className="absolute -top-2.5 right-4 inline-flex items-center gap-1 rounded-full bg-forest-700 px-2.5 py-0.5 text-xs font-bold text-white">
          <CircleCheck className="h-3.5 w-3.5" aria-hidden="true" /> {t('selected')}
        </span>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold text-slate-900">{vendor.name}</h3>
          <Rating value={vendor.rating} />
        </div>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-solar-50 text-lg font-extrabold text-solar-700" aria-hidden="true">
          {vendor.name.charAt(0)}
        </span>
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-600">
        <li className="flex items-center gap-1.5">
          <MapPin className="h-4 w-4 text-forest-600" aria-hidden="true" />
          {t('kmAway', { km: vendor.distanceKm.toFixed(1) })}
        </li>
        <li className="flex items-center gap-1.5">
          <Wrench className="h-4 w-4 text-forest-600" aria-hidden="true" />
          {t('installationsCount', { count: vendor.installations })}
        </li>
      </ul>
      <ul className="mt-3 flex flex-wrap gap-2">
        {vendor.empanelled && (
          <li className="inline-flex items-center gap-1 rounded-full bg-forest-50 px-2.5 py-1 text-xs font-semibold text-forest-800">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> {t('mnre')}
          </li>
        )}
        {vendor.verified && (
          <li className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-800">
            <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" /> {t('verifiedPartner')}
          </li>
        )}
      </ul>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={onViewDetails}>
          {t('viewDetails')}
        </Button>
        <Button variant={selected ? 'subtle' : 'primary'} onClick={onSelect} aria-pressed={selected}>
          {selected ? (
            <>
              <CircleCheck className="h-4 w-4" aria-hidden="true" /> {t('selected')}
            </>
          ) : (
            t('selectVendor')
          )}
        </Button>
      </div>
    </motion.article>
  );
}
