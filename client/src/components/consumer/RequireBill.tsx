import { Receipt } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/shared/States';
import { buttonVariants } from '@/components/ui/button';
import { useConsumer } from '@/context/ConsumerContext';
import { useLanguage } from '@/context/LanguageContext';

/** Shows a friendly prompt instead of broken numbers when a step is opened without bill data. */
export function RequireBill({ children }: { children: ReactNode }) {
  const { solarRecommendation } = useConsumer();
  const { t } = useLanguage();
  if (!solarRecommendation || solarRecommendation.recommendedKW === 0) {
    return (
      <div className="p-5">
        <EmptyState
          icon={<Receipt className="h-6 w-6" aria-hidden="true" />}
          title={t('needBillTitle')}
          description={t('needBillText')}
          action={
            <Link to="/consumer/audit" className={buttonVariants({ className: 'mt-2' })}>
              {t('goToAudit')}
            </Link>
          }
        />
      </div>
    );
  }
  return <>{children}</>;
}
