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
import type { BillExtraction } from '@/utils/billOcr';

export function AuditPage() {
  const { t } = useLanguage();
  const { billData, setBillData, setAuditId } = useConsumer();
  const navigate = useNavigate();
  useDocumentTitle(t('auditTitle'));

  const [showForm, setShowForm] = useState(Boolean(billData));
  const [fromOcr, setFromOcr] = useState(billData?.source === 'ocr');
  const [extracted, setExtracted] = useState<Partial<BillData>>({});
  const [resetKey, setResetKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [initialValues, setInitialValues] = useState<BillFormValues>({
    state: billData?.state ?? '',
    monthlyUnits: billData ? String(billData.monthlyUnits) : '',
    monthlyBill: billData?.monthlyBill ? String(billData.monthlyBill) : '',
  });

  const handleExtracted = (values: BillExtraction) => {
    const metadata = {
      consumerName: values.consumerName,
      consumerNumber: values.consumerNumber,
      discom: values.discom,
      meterNumber: values.meterNumber,
      billingPeriod: values.billingPeriod,
      sanctionedLoad: values.sanctionedLoad,
    };
    setExtracted(metadata);
    setInitialValues({
      state: values.state ?? initialValues.state,
      monthlyUnits: values.monthlyUnits === undefined ? initialValues.monthlyUnits : String(values.monthlyUnits),
      monthlyBill: values.monthlyBill === undefined ? initialValues.monthlyBill : String(values.monthlyBill),
    });
    setFromOcr(true);
    setShowForm(true);
    setResetKey((k) => k + 1);
  };

  const handleSubmit = async (bill: BillData) => {
    setSubmitting(true);
    const completedBill = { ...bill, ...extracted };
    setBillData(completedBill);
    try {
      const { auditId } = await createAudit(completedBill);
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
      {Object.values(extracted).some(Boolean) && <div className="rounded-xl border border-forest-100 bg-forest-50 p-3 text-sm text-forest-900"><p className="font-semibold">{t('ocrOtherDetails')}</p><dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">{([['Consumer number', extracted.consumerNumber], ['Consumer name', extracted.consumerName], ['Electricity provider', extracted.discom], ['Meter number', extracted.meterNumber], ['Billing period', extracted.billingPeriod], ['Sanctioned load', extracted.sanctionedLoad]] as const).filter(([, value]) => value).map(([label, value]) => <div key={label}><dt className="inline text-forest-700">{label}: </dt><dd className="inline font-medium">{value}</dd></div>)}</dl><p className="mt-2 text-xs">{t('checkValues')}</p></div>}

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
