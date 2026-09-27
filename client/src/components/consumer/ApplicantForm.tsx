import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Field, Input } from '@/components/ui/input';
import type { ApplicantDetails } from '@/context/ConsumerContext';
import { useLanguage } from '@/context/LanguageContext';

export const APPLICANT_FORM_ID = 'applicant-form';

interface ApplicantFormProps {
  defaultValues: ApplicantDetails;
  onValid: (values: ApplicantDetails) => void;
}

const normalisePhone = (value: string) => value.replace(/[\s-]/g, '').replace(/^(\+91|91)(?=\d{10}$)/, '');

export function ApplicantForm({ defaultValues, onValid }: ApplicantFormProps) {
  const { t } = useLanguage();
  const schema = useMemo(
    () =>
      z.object({
        name: z.string().trim().min(2, t('errName')).max(80, t('errName')),
        phone: z
          .string()
          .transform(normalisePhone)
          .refine((v) => /^[6-9]\d{9}$/.test(v), t('errPhone')),
        location: z.string().trim().min(2, t('errLocation')).max(120, t('errLocation')),
      }),
    [t],
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ApplicantDetails>({ resolver: zodResolver(schema), defaultValues, mode: 'onTouched' });

  return (
    <form id={APPLICANT_FORM_ID} onSubmit={handleSubmit(onValid)} noValidate className="space-y-4">
      <Field id="applicant-name" label={t('nameLabel')} error={errors.name?.message}>
        <Input id="applicant-name" autoComplete="name" invalid={!!errors.name} aria-describedby={errors.name ? 'applicant-name-error' : undefined} {...register('name')} />
      </Field>
      <Field id="applicant-phone" label={t('phoneLabel')} error={errors.phone?.message}>
        <Input
          id="applicant-phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          prefix="+91"
          className="pl-12 tracking-wide"
          invalid={!!errors.phone}
          aria-describedby={errors.phone ? 'applicant-phone-error' : undefined}
          {...register('phone')}
        />
      </Field>
      <Field id="applicant-location" label={t('locationLabel')} error={errors.location?.message}>
        <Input
          id="applicant-location"
          autoComplete="address-level2"
          invalid={!!errors.location}
          aria-describedby={errors.location ? 'applicant-location-error' : undefined}
          {...register('location')}
        />
      </Field>
    </form>
  );
}
