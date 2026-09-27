import { ChevronLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Logo } from '@/components/shared/Logo';
import { useLanguage } from '@/context/LanguageContext';
import { LanguageSwitcher } from './LanguageSwitcher';
import { StepProgress } from './StepProgress';

const BACK_ROUTES: Record<string, string> = {
  '/consumer': '/',
  '/consumer/onboarding': '/consumer',
  '/consumer/audit': '/consumer/onboarding',
  '/consumer/subsidy': '/consumer/audit',
  '/consumer/financing': '/consumer/subsidy',
  '/consumer/vendors': '/consumer/financing',
  '/consumer/track': '/consumer/application-success',
};

const STEP_BY_ROUTE: Record<string, number> = {
  '/consumer/audit': 1,
  '/consumer/subsidy': 2,
  '/consumer/financing': 3,
  '/consumer/vendors': 4,
};

export function ConsumerHeader() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const backTo = BACK_ROUTES[pathname];
  const step = STEP_BY_ROUTE[pathname];

  return (
    <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/75">
      <div className="flex h-14 items-center gap-2 px-3">
        {backTo ? (
          <button
            type="button"
            onClick={() => navigate(backTo)}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100"
            aria-label={t('back')}
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
        ) : (
          <span className="w-2" />
        )}
        <div className="flex-1">
          <Logo className="scale-90 origin-left" />
        </div>
        {pathname !== '/consumer' && <LanguageSwitcher />}
      </div>
      {step && <StepProgress current={step} />}
    </header>
  );
}
