import { motion } from 'framer-motion';
import { ArrowRight, Sun } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LanguageOptions } from '@/components/consumer/LanguageOptions';
import { StickyActions } from '@/components/consumer/StickyActions';
import { Button } from '@/components/ui/button';
import { useConsumer } from '@/context/ConsumerContext';
import { useLanguage } from '@/context/LanguageContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export function LanguageSelectPage() {
  const { t, hasChosenLanguage } = useLanguage();
  const { onboardingComplete } = useConsumer();
  const navigate = useNavigate();
  useDocumentTitle(t('welcomeTitle'));

  const next = () => navigate(onboardingComplete ? '/consumer/audit' : '/consumer/onboarding');

  return (
    <div className="flex flex-1 flex-col">
      <div className="space-y-6 px-5 pb-6 pt-8">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 14 }}
          className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-[2rem] bg-gradient-to-br from-solar-300 to-solar-500 shadow-lift"
          aria-hidden="true"
        >
          <Sun className="h-12 w-12 animate-spin-slow text-white" strokeWidth={2.2} />
        </motion.div>
        <div className="text-center">
          <h1 className="text-[28px] font-extrabold leading-tight tracking-tight text-slate-900">{t('welcomeTitle')}</h1>
          <p className="mt-2 text-lg font-semibold text-forest-700">{t('selectLanguage')}</p>
        </div>
        <LanguageOptions onSelected={() => window.setTimeout(next, 250)} />
        <p className="text-center text-sm text-slate-500">{t('languageHint')}</p>
      </div>
      {hasChosenLanguage && (
        <StickyActions>
          <Button size="xl" onClick={next}>
            {t('continue')} <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </Button>
        </StickyActions>
      )}
    </div>
  );
}
