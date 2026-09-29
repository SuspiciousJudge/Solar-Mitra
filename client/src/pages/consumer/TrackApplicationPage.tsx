import { RefreshCw } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { JourneyTimeline } from '@/components/consumer/JourneyTimeline';
import { ScreenHeading } from '@/components/consumer/ScreenHeading';
import { PageTransition } from '@/components/shared/PageTransition';
import { EmptyState, ErrorState } from '@/components/shared/States';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useConsumer } from '@/context/ConsumerContext';
import { useLanguage } from '@/context/LanguageContext';
import { statusKey } from '@/i18n/translations';
import { STATUS_BADGE_VARIANT } from '@/utils/statusVisuals';
import { useAsync } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { trackApplication } from '@/services/applicationService';
import type { TrackedApplication } from '@/types';
import { formatDate } from '@/utils/format';

export function TrackApplicationPage() {
  const { t } = useLanguage();
  const { application } = useConsumer();
  const [params] = useSearchParams();
  const id = params.get('id') ?? application?.id;
  useDocumentTitle(t('trackTitle'));

  const query = useAsync<TrackedApplication | null>(() => (id ? trackApplication(id) : Promise.resolve(null)), [id]);

  if (!id) {
    return (
      <div className="p-5">
        <EmptyState
          title={t('noApplicationTitle')}
          description={t('noApplicationText')}
          action={
            <Link to="/consumer/audit" className={buttonVariants({ className: 'mt-2' })}>
              {t('goToAudit')}
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <PageTransition className="space-y-4 px-5 pb-8 pt-5">
      <div className="flex items-start justify-between gap-3">
        <ScreenHeading title={t('trackTitle')} subtitle={<span className="font-mono font-semibold">{id}</span>} />
        <Button variant="outline" size="sm" onClick={query.reload} loading={query.loading} aria-label={t('refresh')}>
          {!query.loading && <RefreshCw className="h-4 w-4" aria-hidden="true" />}
          {t('refresh')}
        </Button>
      </div>

      {query.loading && !query.data && (
        <Card className="space-y-3 p-5">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-40 w-full" />
        </Card>
      )}
      {query.error && <ErrorState message={t('trackNotFound')} onRetry={query.reload} retryLabel={t('tryAgain')} />}
      {query.data && (
        <>
          <Card className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('currentStatus')}</p>
            <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
              <Badge variant={STATUS_BADGE_VARIANT[query.data.status]} className="px-3 py-1 text-sm">
                {t(statusKey(query.data.status))}
              </Badge>
              <span className="text-xs text-slate-500">
                {t('lastUpdated')}: {formatDate(query.data.updatedAt, true)}
              </span>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              {query.data.systemKW} kW{query.data.vendorName ? ` · ${query.data.vendorName}` : ''}
            </p>
          </Card>
          <Card className="p-5">
            <h2 className="mb-4 text-base font-bold text-slate-900">{t('whatNext')}</h2>
            <JourneyTimeline status={query.data.status} />
          </Card>
          <Card className="p-5">
            <ol className="space-y-3">
              {[...query.data.timeline].reverse().map((event, index) => (
                <li key={`${event.at}-${index}`} className="flex justify-between gap-3 text-sm">
                  <span className="font-semibold text-slate-800">{t(statusKey(event.status))}</span>
                  <time className="shrink-0 text-slate-500" dateTime={event.at}>
                    {formatDate(event.at, true)}
                  </time>
                </li>
              ))}
            </ol>
          </Card>
        </>
      )}
    </PageTransition>
  );
}
