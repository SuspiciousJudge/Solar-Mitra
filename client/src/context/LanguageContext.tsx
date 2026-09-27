import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { translations, type TranslationKey } from '@/i18n/translations';
import type { Language } from '@/types';

const STORAGE_KEY = 'solarmitra.language';

type Vars = Record<string, string | number>;

interface LanguageContextValue {
  language: Language;
  hasChosenLanguage: boolean;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey, vars?: Vars) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function readStoredLanguage(): Language | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored && stored in translations ? (stored as Language) : null;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState<Language | null>(readStoredLanguage);
  const language = stored ?? 'en';

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((next: Language) => {
    localStorage.setItem(STORAGE_KEY, next);
    setStored(next);
  }, []);

  const t = useCallback(
    (key: TranslationKey, vars?: Vars) => {
      const template = translations[language][key] ?? translations.en[key] ?? key;
      if (!vars) return template;
      return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match));
    },
    [language],
  );

  const value = useMemo(() => ({ language, hasChosenLanguage: stored !== null, setLanguage, t }), [language, stored, setLanguage, t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used inside LanguageProvider');
  return context;
}

export const clearStoredLanguage = () => localStorage.removeItem(STORAGE_KEY);
