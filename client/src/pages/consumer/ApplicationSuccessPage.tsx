import { motion } from 'framer-motion';
import { Check, Copy, House, MessageSquareText, Radar } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { JourneyTimeline } from '@/components/consumer/JourneyTimeline';
import { StickyActions } from '@/components/consumer/StickyActions';
import { EmptyState } from '@/components/shared/States';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useConsumer } from '@/context/ConsumerContext';
import { useLanguage } from '@/context/LanguageContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export function ApplicationSuccessPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { application, selectedVendor } = useConsumer();
  useDocumentTitle(t('successTitle'));

  if (!application) {
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

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(application.id);
      toast.success(`${application.id} ✓`);
    } catch {
      toast.message(application.id);
    }
  };

  return (
    <>
      <div className="space-y-5 px-5 pb-6 pt-8">
        <div className="text-center">
          <motion.div
            className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-forest-600 shadow-lift"
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 12 }}
          >
            <Check className="h-10 w-10 text-white" strokeWidth={3} aria-hidden="true" />
          </motion.div>
          <motion.h1
            className="mt-5 text-[26px] font-extrabold leading-tight tracking-tight text-slate-900 text-balance"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {t('successTitle')}
          </motion.h1>
          {selectedVendor && <p className="mt-2 text-[15px] text-slate-600">{t('successSubtitle', { vendor: selectedVendor.name })}</p>}
        </div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.35 }}>
          <Card className="flex items-center justify-between gap-3 border-2 border-dashed border-forest-300 bg-forest-50/60 p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-forest-700">{t('applicationId')}</p>
              <p className="mt-1 font-mono text-2xl font-extrabold tracking-wide text-forest-900">{application.id}</p>
            </div>
            <Button variant="white" size="icon" onClick={copyId} aria-label={`Copy ${application.id}`}>
              <Copy className="h-4 w-4" aria-hidden="true" />
            </Button>
          </Card>
        </motion.div>

        {application.offline && <p className="rounded-2xl bg-solar-50 p-3 text-xs font-medium text-solar-900">{t('offlineSaved')}</p>}

        <Card className="p-5">
          <h2 className="mb-4 text-base font-bold text-slate-900">{t('whatNext')}</h2>
          <JourneyTimeline status={application.status} />
        </Card>

        <p className="flex items-center justify-center gap-2 text-sm text-slate-500">
          <MessageSquareText className="h-4 w-4" aria-hidden="true" /> {t('smsNote')}
        </p>
      </div>
      <StickyActions>
        <Button size="xl" onClick={() => navigate('/consumer/track')} disabled={application.offline}>
          <Radar className="h-5 w-5" aria-hidden="true" /> {t('trackApplication')}
        </Button>
        <Link to="/" className={buttonVariants({ variant: 'ghost', size: 'lg' })}>
          <House className="h-4 w-4" aria-hidden="true" /> {t('backHome')}
        </Link>
      </StickyActions>
    </>
  );
}
