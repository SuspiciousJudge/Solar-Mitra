import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { BillForm, type BillFormValues } from '@/components/consumer/BillForm';
import { BillUploadCard } from '@/components/consumer/BillUploadCard';
import { ScreenHeading } from '@/components/consumer/ScreenHeading';
import { PageTransition } from '@/components/shared/PageTransition';
import { useConsumer } from '@/context/ConsumerContext';
import { useLanguage } from '@/context/LanguageContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { createAudit } from '@/services/auditService';
import { getErrorMessage } from '@/services/api';
import type { BillData } from '@/types';

export function AuditPage() {
  const { t } = useLanguage();
  const { billData, setBillData, setAuditId } = useConsumer();
  const navigate = useNavigate();
  useDocumentTitle(t('auditTitle'));

  const [showForm, setShowForm] = useState(Boolean(billData));
  const [fromOcr, setFromOcr] = useState(billData?.source === 'ocr-demo');
  const [resetKey, setResetKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [initialValues, setInitialValues] = useState<BillFormValues>({
    state: billData?.state ?? '',
    monthlyUnits: billData ? String(billData.monthlyUnits) : '',
    monthlyBill: billData?.monthlyBill ? String(billData.monthlyBill) : '',
  });

  const handleExtracted = (values: { state: string; monthlyUnits: number; monthlyBill: number }) => {
    setInitialValues({ state: values.state, monthlyUnits: String(values.monthlyUnits), monthlyBill: String(values.monthlyBill) });
    setFromOcr(true);
    setShowForm(true);
    setResetKey((k) => k + 1);
  };

  const handleSubmit = async (bill: BillData) => {
    setSubmitting(true);
    setBillData(bill);
    try {
      const { auditId } = await createAudit(bill);
      setAuditId(auditId);
      navigate('/consumer/subsidy');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageTransition className="space-y-5 px-5 pb-8 pt-5">
      <ScreenHeading title={t('auditTitle')} subtitle={t('auditSubtitle')} />
      <BillUploadCard onExtracted={handleExtracted} completed={fromOcr} />

      {showForm ? (
        <section aria-label={t('checkValues')} className="space-y-3">
          <p className="text-sm font-medium text-slate-600">{t('checkValues')}</p>
          <BillForm initialValues={initialValues} resetKey={resetKey} fromOcr={fromOcr} submitting={submitting} onSubmit={handleSubmit} />
        </section>
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="w-full rounded-2xl border border-dashed border-slate-300 py-4 text-sm font-semibold text-forest-700 hover:bg-forest-50"
        >
          {t('enterManually')}
        </button>
      )}
    </PageTransition>
  );
}
