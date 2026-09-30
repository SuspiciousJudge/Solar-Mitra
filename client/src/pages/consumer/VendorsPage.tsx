import { MapPin, SearchX } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { APPLICANT_FORM_ID, ApplicantForm } from '@/components/consumer/ApplicantForm';
import { RequireBill } from '@/components/consumer/RequireBill';
import { ScreenHeading } from '@/components/consumer/ScreenHeading';
import { StickyActions } from '@/components/consumer/StickyActions';
import { VendorCard } from '@/components/consumer/VendorCard';
import { VendorDetailsDialog } from '@/components/consumer/VendorDetailsDialog';
import { Disclaimer } from '@/components/shared/Disclaimer';
import { PageTransition } from '@/components/shared/PageTransition';
import { EmptyState, ErrorState } from '@/components/shared/States';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useConsumer, type ApplicantDetails } from '@/context/ConsumerContext';
import { useDemo } from '@/context/DemoContext';
import { useLanguage } from '@/context/LanguageContext';
import { DEMO_LOCATION } from '@/data/states';
import { useAsync } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { getErrorMessage } from '@/services/api';
import { submitApplication } from '@/services/applicationService';
import { fetchVendors } from '@/services/vendorService';
import type { Vendor } from '@/types';
import { celebrate } from '@/utils/confetti';
import { formatINR } from '@/utils/format';

function VendorsContent() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { demoMode } = useDemo();
  const { billData, solarRecommendation, activeFinancing, selectedVendor, selectVendor, applicant, setApplicant, setApplication, auditId } = useConsumer();
  const [detailsVendor, setDetailsVendor] = useState<Vendor | null>(null);
  const [submitting, setSubmitting] = useState(false);
  useDocumentTitle(t('vendorsTitle'));

  const state = billData?.state ?? DEMO_LOCATION.state;
  const locationLabel = state === DEMO_LOCATION.state ? DEMO_LOCATION.label : state;
  const vendorsQuery = useAsync(() => fetchVendors({ state, active: true, verified: true }), [state]);
  const vendors = vendorsQuery.data?.vendors ?? [];

  if (!billData || !solarRecommendation || !activeFinancing) return null;
  const isLoan = activeFinancing.mode === 'emi' && activeFinancing.loanAmount > 0;

  const defaultApplicant: ApplicantDetails = applicant ?? {
    name: demoMode ? 'Ramesh Kumar' : '',
    phone: demoMode ? '9876543210' : '',
    location: state === DEMO_LOCATION.state ? DEMO_LOCATION.city : '',
  };

  const handleSubmit = async (details: ApplicantDetails) => {
    if (!selectedVendor) {
      toast.error(t('selectVendorFirst'));
      document.getElementById('vendor-list')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    setApplicant(details);
    setSubmitting(true);
    try {
      const result = await submitApplication({
        applicantName: details.name,
        phone: details.phone,
        location: `${details.location}, ${billData.state}`,
        state: billData.state,
        monthlyUnits: billData.monthlyUnits,
        monthlyBill: billData.monthlyBill,
        vendorId: selectedVendor.id,
        auditId,
        loanAmount: isLoan ? activeFinancing.loanAmount : 0,
        interestRate: activeFinancing.interestRate,
        tenureMonths: activeFinancing.tenureMonths,
      });
      setApplication(result);
      celebrate();
      navigate('/consumer/application-success');
    } catch (error) {
      toast.error(getErrorMessage(error, t('submitError')));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageTransition className="space-y-5 px-5 pb-6 pt-5">
        <ScreenHeading
          title={t('vendorsTitle')}
          eyebrow={
            <span className="inline-flex items-center gap-1.5 rounded-full bg-forest-50 px-3 py-1 text-xs font-semibold text-forest-800">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" /> {t('nearLocation', { location: locationLabel })}
            </span>
          }
        />

        <section id="vendor-list" className="space-y-3" aria-busy={vendorsQuery.loading}>
          {vendorsQuery.loading &&
            [0, 1, 2].map((i) => (
              <Card key={i} className="space-y-3 p-4">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-10 w-full" />
              </Card>
            ))}
          {vendorsQuery.error && <ErrorState message={t('loadError')} onRetry={vendorsQuery.reload} retryLabel={t('tryAgain')} />}
          {!vendorsQuery.loading && !vendorsQuery.error && vendors.length === 0 && (
            <EmptyState icon={<SearchX className="h-6 w-6" aria-hidden="true" />} title={t('noVendorsTitle')} description={t('noVendorsText')} />
          )}
          {vendorsQuery.data?.offline && <p className="text-xs font-medium text-solar-800">{t('offlineVendors')}</p>}
          {!vendorsQuery.loading &&
            vendors.map((vendor, index) => (
              <VendorCard
                key={vendor.id}
                vendor={vendor}
                index={index}
                selected={selectedVendor?.id === vendor.id}
                onSelect={() => selectVendor(vendor)}
                onViewDetails={() => setDetailsVendor(vendor)}
              />
            ))}
        </section>

        <Card className="p-5">
          <h2 className="text-base font-bold text-slate-900">{t('yourPlan')}</h2>
          <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-forest-50 p-2.5">
              <dt className="text-[11px] font-semibold text-forest-700">{t('recommendedSystem')}</dt>
              <dd className="text-lg font-extrabold tabular-nums text-forest-900">{solarRecommendation.recommendedKW} kW</dd>
            </div>
            <div className="rounded-2xl bg-slate-50 p-2.5">
              <dt className="text-[11px] font-semibold text-slate-500">{t('netCost')}</dt>
              <dd className="text-lg font-extrabold tabular-nums text-slate-900">{formatINR(solarRecommendation.netCost)}</dd>
            </div>
            <div className="rounded-2xl bg-solar-50 p-2.5">
              <dt className="text-[11px] font-semibold text-solar-800">{isLoan ? t('monthlyEmi') : t('payUpfront')}</dt>
              <dd className="text-lg font-extrabold tabular-nums text-slate-900">
                {isLoan ? formatINR(activeFinancing.emi) : formatINR(solarRecommendation.netCost)}
              </dd>
            </div>
          </dl>
        </Card>

        <Card className="p-5">
          <h2 className="text-base font-bold text-slate-900">{t('yourDetails')}</h2>
          <p className="mb-4 mt-0.5 text-sm text-slate-500">{t('yourDetailsHint')}</p>
          <ApplicantForm defaultValues={defaultApplicant} onValid={handleSubmit} />
        </Card>

        {isLoan && <Disclaimer tone="yellow">{t('financialDisclaimer')}</Disclaimer>}
      </PageTransition>

      <StickyActions>
        {!selectedVendor && vendors.length > 0 && <p className="text-center text-xs font-medium text-slate-500">{t('selectVendorFirst')}</p>}
        <Button type="submit" form={APPLICANT_FORM_ID} size="xl" variant="solar" loading={submitting} disabled={vendors.length === 0 && !vendorsQuery.loading}>
          {submitting ? t('submitting') : isLoan ? t('book') : t('bookUpfront')}
        </Button>
      </StickyActions>

      <VendorDetailsDialog
        vendor={detailsVendor}
        selected={detailsVendor?.id === selectedVendor?.id}
        onClose={() => setDetailsVendor(null)}
        onSelect={selectVendor}
      />
    </>
  );
}

export function VendorsPage() {
  return (
    <RequireBill>
      <VendorsContent />
    </RequireBill>
  );
}
