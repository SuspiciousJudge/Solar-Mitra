import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Smartphone } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { Logo } from '@/components/shared/Logo';
import { Button } from '@/components/ui/button';
import { Checkbox, Field, Input } from '@/components/ui/input';
import { useProviderAuth } from '@/context/ProviderAuthContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { getErrorMessage } from '@/services/api';
import { DEMO_PROVIDER_OTP, passwordIssues } from '@/utils/providerRules';

const schema = z
  .object({
    name: z.string().trim().min(2, 'Enter your full name'),
    email: z.string().trim().email('Enter a valid business email'),
    mobile: z
      .string()
      .trim()
      .transform((value) => value.replace(/\D/g, '').slice(-10))
      .refine((value) => /^[6-9]\d{9}$/.test(value), 'Enter a 10-digit mobile starting with 6–9'),
    password: z.string().superRefine((value, ctx) => {
      const issue = passwordIssues(value);
      if (issue) ctx.addIssue({ code: z.ZodIssueCode.custom, message: issue });
    }),
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, { errorMap: () => ({ message: 'Please accept the partner terms' }) }),
    otp: z.string().trim().min(4, 'Enter the OTP'),
  })
  .refine((value) => value.password === value.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' });

type Values = z.infer<typeof schema>;

export function ProviderRegisterPage() {
  useDocumentTitle('Create partner account');
  const { register: registerAccount, status } = useProviderAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', mobile: '', password: '', confirmPassword: '', otp: '', acceptTerms: true },
  });

  if (status === 'authenticated') return <Navigate to="/provider/application" replace />;

  const onSubmit = async (values: Values) => {
    setError(null);
    try {
      await registerAccount({
        name: values.name,
        email: values.email,
        mobile: values.mobile,
        password: values.password,
        confirmPassword: values.confirmPassword,
        acceptTerms: true,
        otp: values.otp,
      });
      toast.success('Account created. Continue your application.');
      navigate('/provider/application');
    } catch (err) {
      setError(getErrorMessage(err, 'Could not create the account.'));
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <Link to="/provider" className="mb-8 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
      </Link>
      <Logo showTagline tagline="Partner portal" />
      <h1 className="mt-6 text-2xl font-extrabold text-slate-900">Create a partner account</h1>
      <p className="mt-1 text-sm text-slate-500">Mobile OTP is simulated in demo mode. Use {DEMO_PROVIDER_OTP}.</p>
      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 space-y-4">
        <Field id="reg-name" label="Full name" error={errors.name?.message}>
          <Input id="reg-name" autoComplete="name" invalid={!!errors.name} {...register('name')} />
        </Field>
        <Field id="reg-email" label="Business email" error={errors.email?.message}>
          <Input id="reg-email" type="email" autoComplete="email" invalid={!!errors.email} {...register('email')} />
        </Field>
        <Field id="reg-mobile" label="Mobile (+91)" error={errors.mobile?.message}>
          <Input id="reg-mobile" inputMode="numeric" autoComplete="tel" prefix={<Smartphone className="h-4 w-4" aria-hidden="true" />} invalid={!!errors.mobile} {...register('mobile')} />
        </Field>
        <Field id="reg-password" label="Password" hint="Min 8 characters, 1 letter and 1 number" error={errors.password?.message}>
          <Input id="reg-password" type="password" autoComplete="new-password" invalid={!!errors.password} {...register('password')} />
        </Field>
        <Field id="reg-confirm" label="Confirm password" error={errors.confirmPassword?.message}>
          <Input id="reg-confirm" type="password" autoComplete="new-password" invalid={!!errors.confirmPassword} {...register('confirmPassword')} />
        </Field>
        <Field id="reg-otp" label="Mobile OTP" hint={`Demo OTP ${DEMO_PROVIDER_OTP} — labelled for hackathon simulation only`} error={errors.otp?.message}>
          <Input id="reg-otp" inputMode="numeric" invalid={!!errors.otp} {...register('otp')} />
        </Field>
        <Checkbox
          id="reg-terms"
          checked={watch('acceptTerms')}
          onChange={(checked) => setValue('acceptTerms', checked as true, { shouldValidate: true })}
          label="I accept the SolarMitra partner terms and code of conduct"
        />
        {errors.acceptTerms && <p role="alert" className="text-sm text-red-600">{errors.acceptTerms.message}</p>}
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          Create account
        </Button>
      </form>
      <p className="mt-6 text-sm text-slate-600">
        Already registered?{' '}
        <Link to="/provider/login" className="font-semibold text-forest-700">
          Sign in
        </Link>
      </p>
    </div>
  );
}
