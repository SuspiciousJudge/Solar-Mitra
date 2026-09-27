import { BadgeCheck, Briefcase, MapPin, Phone, ShieldCheck, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { useLanguage } from '@/context/LanguageContext';
import type { Vendor } from '@/types';
import { Rating } from './VendorCard';

interface VendorDetailsDialogProps {
  vendor: Vendor | null;
  selected: boolean;
  onClose: () => void;
  onSelect: (vendor: Vendor) => void;
}

export function VendorDetailsDialog({ vendor, selected, onClose, onSelect }: VendorDetailsDialogProps) {
  const { t } = useLanguage();
  return (
    <Dialog
      open={vendor !== null}
      onClose={onClose}
      title={vendor?.name ?? ''}
      description={vendor?.location}
      footer={
        vendor && (
          <>
            <Button variant="outline" onClick={onClose}>
              {t('close')}
            </Button>
            <Button
              onClick={() => {
                onSelect(vendor);
                onClose();
              }}
              disabled={selected}
            >
              {selected ? t('selected') : t('selectVendor')}
            </Button>
          </>
        )
      }
    >
      {vendor && (
        <div className="space-y-4">
          <Rating value={vendor.rating} />
          <ul className="grid grid-cols-2 gap-3 text-sm">
            <li className="flex items-center gap-2 rounded-2xl bg-slate-50 p-3">
              <MapPin className="h-4 w-4 text-forest-600" aria-hidden="true" />
              {t('kmAway', { km: vendor.distanceKm.toFixed(1) })}
            </li>
            <li className="flex items-center gap-2 rounded-2xl bg-slate-50 p-3">
              <Wrench className="h-4 w-4 text-forest-600" aria-hidden="true" />
              {t('installationsCount', { count: vendor.installations })}
            </li>
            <li className="flex items-center gap-2 rounded-2xl bg-slate-50 p-3">
              <Briefcase className="h-4 w-4 text-forest-600" aria-hidden="true" />
              {t('yearsInBusiness', { years: vendor.yearsInBusiness })}
            </li>
            <li className="flex items-center gap-2 rounded-2xl bg-slate-50 p-3">
              <Phone className="h-4 w-4 text-forest-600" aria-hidden="true" />
              <span className="truncate">{vendor.phone}</span>
            </li>
          </ul>
          <div className="flex flex-wrap gap-2">
            {vendor.empanelled && (
              <span className="inline-flex items-center gap-1 rounded-full bg-forest-50 px-2.5 py-1 text-xs font-semibold text-forest-800">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> {t('mnre')}
              </span>
            )}
            {vendor.verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-800">
                <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" /> {t('verifiedPartner')}
              </span>
            )}
          </div>
          {vendor.specialities.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{t('specialities')}</p>
              <ul className="list-inside list-disc space-y-1 text-sm text-slate-700">
                {vendor.specialities.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Dialog>
  );
}
