import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, KeyRound, LogIn, Mail, Wand2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { DemoModeBadge } from '@/components/shared/DemoModeBadge';
import { Logo } from '@/components/shared/Logo';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { useProviderAuth } from '@/context/ProviderAuthContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { getErrorMessage } from '@/services/api';

const schema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(1, 'Please enter your password'),
});
type Values = z.infer<typeof schema>;

const DEMOS = [
  { label: 'Draft', email: 'provider.new@solarmitra.demo' },
  { label: 'Pending', email: 'provider.pending@solarmitra.demo' },
  { label: 'Approved', email: 'provider.approved@solarmitra.demo' },
];

export function ProviderLoginPage() {
  useDocumentTitle('Partner login');
  const { login, status } = useProviderAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const expired = params.get('expired') === '1';
  const from = (location.state as { from?: string } | null)?.from ?? '/provider/application';

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const banner = useMemo(
    () => (expired ? 'Your session has expired. Please sign in again.' : null),
    [expired],
  );

  if (status === 'authenticated') return <Navigate to={from} replace />;

  const onSubmit = async (values: Values) => {
    setError(null);
    try {
      await login(values.email, values.password);
      toast.success('Welcome back');
      navigate(from, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Sign in failed. Please try again.'));
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <Link to="/provider" className="mb-8 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
      </Link>
      <Logo showTagline tagline="Partner portal" />
      <div className="mt-6 flex items-center gap-2">
        <h1 className="text-2xl font-extrabold text-slate-900">Partner sign in</h1>
        <DemoModeBadge />
      </div>
      <p className="mt-1 text-sm text-slate-500">Use your business email. Demo password is demo123.</p>
      {(banner || error) && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {error ?? banner}
        </p>
      )}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 space-y-4">
        <Field id="provider-email" label="Business email" error={errors.email?.message}>
          <Input id="provider-email" type="email" autoComplete="username" prefix={<Mail className="h-4 w-4" aria-hidden="true" />} invalid={!!errors.email} {...register('email')} />
        </Field>
        <Field id="provider-password" label="Password" error={errors.password?.message}>
          <Input id="provider-password" type="password" autoComplete="current-password" prefix={<KeyRound className="h-4 w-4" aria-hidden="true" />} invalid={!!errors.password} {...register('password')} />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          {!isSubmitting && <LogIn className="h-4 w-4" aria-hidden="true" />} Sign in
        </Button>
      </form>
      <div className="mt-6 rounded-2xl border border-dashed border-solar-300 bg-solar-50 p-4 text-sm">
        <p className="font-bold text-solar-900">Demo accounts</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {DEMOS.map((demo) => (
            <Button
              key={demo.email}
              variant="white"
              size="sm"
              onClick={() => {
                setValue('email', demo.email, { shouldValidate: true });
                setValue('password', 'demo123', { shouldValidate: true });
              }}
            >
              <Wand2 className="h-4 w-4" aria-hidden="true" /> {demo.label}
            </Button>
          ))}
        </div>
      </div>
      <p className="mt-6 text-sm text-slate-600">
        New partner?{' '}
        <Link to="/provider/register" className="font-semibold text-forest-700">
          Create an account
        </Link>
      </p>
    </div>
  );
}
