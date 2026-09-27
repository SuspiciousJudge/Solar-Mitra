import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound, LayoutDashboard, Smartphone } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { LanguageSwitcher } from '@/components/consumer/LanguageSwitcher';
import { Logo } from '@/components/shared/Logo';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, Input } from '@/components/ui/input';
import { useConsumer } from '@/context/ConsumerContext';
import { useLanguage } from '@/context/LanguageContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

const DEMO_OTP = '123456';

interface LoginValues {
  phone: string;
  otp: string;
}

/** Simulated consumer sign-in (phone + OTP). Operators use JWT login at /admin/login. */
export function LoginPage() {
  const { t } = useLanguage();
  const { applicant, setApplicant } = useConsumer();
  const navigate = useNavigate();
  const [otpSent, setOtpSent] = useState(false);
  useDocumentTitle(t('loginTitle'));

  const schema = useMemo(
    () =>
      z.object({
        phone: z.string().transform((v) => v.replace(/\D/g, '').slice(-10)).refine((v) => /^[6-9]\d{9}$/.test(v), t('errPhone')),
        otp: z.string(),
      }),
    [t],
  );

  const { register, handleSubmit, setError, formState: { errors } } = useForm<LoginValues>({
    resolver: zodResolver(schema),
    defaultValues: { phone: applicant?.phone ?? '', otp: '' },
  });

  const onSubmit = (values: LoginValues) => {
    if (!otpSent) {
      setOtpSent(true);
      toast.success(t('otpHint'));
      return;
    }
    if (values.otp.trim() !== DEMO_OTP) {
      setError('otp', { message: t('errOtp') });
      return;
    }
    setApplicant({ name: applicant?.name ?? '', location: applicant?.location ?? '', phone: values.phone });
    navigate('/consumer');
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-br from-forest-50 via-white to-solar-50 p-4">
      <Card className="w-full max-w-md p-6 sm:p-8">
        <div className="flex items-center justify-between">
          <Link to="/" aria-label="SolarMitra home">
            <Logo />
          </Link>
          <LanguageSwitcher />
        </div>
        <h1 className="mt-8 text-2xl font-extrabold text-slate-900">{t('loginTitle')}</h1>
        <p className="mt-1 text-sm text-slate-500">{t('loginSubtitle')}</p>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Field id="login-phone" label={t('phoneLabel')} error={errors.phone?.message}>
            <Input id="login-phone" type="tel" inputMode="tel" prefix="+91" className="pl-12" invalid={!!errors.phone} disabled={otpSent} {...register('phone')} />
          </Field>
          {otpSent && (
            <Field id="login-otp" label={t('otpLabel')} error={errors.otp?.message} hint={t('otpHint')}>
              <Input id="login-otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} className="text-center text-xl tracking-[0.5em]" invalid={!!errors.otp} autoFocus {...register('otp')} />
            </Field>
          )}
          <Button type="submit" size="xl" className="w-full">
            {otpSent ? <KeyRound className="h-5 w-5" aria-hidden="true" /> : <Smartphone className="h-5 w-5" aria-hidden="true" />}
            {otpSent ? t('verifyContinue') : t('sendOtp')}
          </Button>
        </form>
        <Link to="/admin/login" className="mt-6 flex items-center justify-center gap-2 text-sm font-semibold text-forest-700 hover:underline">
          <LayoutDashboard className="h-4 w-4" aria-hidden="true" /> {t('operatorLogin')}
        </Link>
      </Card>
    </div>
  );
}
