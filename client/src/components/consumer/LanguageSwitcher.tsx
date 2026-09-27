import { Languages } from 'lucide-react';
import { useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { useLanguage } from '@/context/LanguageContext';
import { LANGUAGE_OPTIONS } from '@/i18n/translations';
import { LanguageOptions } from './LanguageOptions';

export function LanguageSwitcher() {
  const { t, language } = useLanguage();
  const [open, setOpen] = useState(false);
  const current = LANGUAGE_OPTIONS.find((option) => option.code === language);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        aria-label={`${t('changeLanguage')}: ${current?.english}`}
      >
        <Languages className="h-4 w-4 text-forest-700" aria-hidden="true" />
        <span>{current?.label}</span>
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title={t('selectLanguage')}>
        <LanguageOptions onSelected={() => setOpen(false)} compact />
      </Dialog>
    </>
  );
}
