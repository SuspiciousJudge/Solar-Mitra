import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/input';
import { useLanguage } from '@/context/LanguageContext';
import { STATES } from '@/data/states';
import type { BillData } from '@/types';

export interface BillFormValues {
  state: string;
  monthlyUnits: string;
  monthlyBill: string;
}

interface BillFormProps {
  initialValues: BillFormValues;
  /** Changing this key re-applies initialValues (e.g. after simulated OCR). */
  resetKey: number;
  fromOcr: boolean;
  submitting: boolean;
  onSubmit: (bill: BillData) => void;
}

const toNumber = (value: string) => Number(String(value).replace(/[,\s₹]/g, ''));

export function BillForm({ initialValues, resetKey, fromOcr, submitting, onSubmit }: BillFormProps) {
  const { t } = useLanguage();

  const schema = useMemo(
    () =>
      z.object({
        state: z.string().min(1, t('errState')),
        monthlyUnits: z
          .string()
          .refine((v) => Number.isFinite(toNumber(v)) && toNumber(v) > 0, t('errUnits'))
          .refine((v) => toNumber(v) <= 20000, t('errUnitsHigh')),
        monthlyBill: z.string().refine((v) => v.trim() === '' || (Number.isFinite(toNumber(v)) && toNumber(v) >= 0 && toNumber(v) <= 1_000_000), t('errBill')),
      }),
    [t],
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<BillFormValues>({ resolver: zodResolver(schema), defaultValues: initialValues });

  useEffect(() => {
    reset(initialValues);
    // Only re-seed when the parent signals new values (resetKey), not on every render.
  }, [resetKey, reset]);

  const submit = (values: BillFormValues) =>
    onSubmit({
      state: values.state,
      monthlyUnits: Math.round(toNumber(values.monthlyUnits)),
      monthlyBill: values.monthlyBill.trim() === '' ? 0 : Math.round(toNumber(values.monthlyBill)),
      source: fromOcr && !isDirty ? 'ocr' : 'manual',
    });

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="space-y-4">
      <Field id="bill-state" label={t('stateLabel')} error={errors.state?.message}>
        <Select id="bill-state" invalid={!!errors.state} aria-describedby={errors.state ? 'bill-state-error' : undefined} {...register('state')}>
          <option value="">{t('statePlaceholder')}</option>
          {STATES.map((state) => (
            <option key={state} value={state}>
              {state}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid grid-cols-1 gap-4 min-[380px]:grid-cols-2">
        <Field id="bill-units" label={t('unitsLabel')} error={errors.monthlyUnits?.message}>
          <Input
            id="bill-units"
            inputMode="numeric"
            autoComplete="off"
            suffix="kWh"
            invalid={!!errors.monthlyUnits}
            aria-describedby={errors.monthlyUnits ? 'bill-units-error' : undefined}
            className="text-lg font-bold"
            {...register('monthlyUnits')}
          />
        </Field>
        <Field id="bill-amount" label={t('billLabel')} error={errors.monthlyBill?.message} hint={t('billHint')}>
          <Input
            id="bill-amount"
            inputMode="numeric"
            autoComplete="off"
            prefix="₹"
            invalid={!!errors.monthlyBill}
            aria-describedby={errors.monthlyBill ? 'bill-amount-error' : 'bill-amount-hint'}
            className="text-lg font-bold"
            {...register('monthlyBill')}
          />
        </Field>
      </div>
      <Button type="submit" size="xl" className="w-full" loading={submitting}>
        {t('seePlan')}
        {!submitting && <ArrowRight className="h-5 w-5" aria-hidden="true" />}
      </Button>
    </form>
  );
}
