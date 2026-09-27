import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, KeyRound, Leaf, LogIn, Mail, ShieldCheck, SolarPanel, Wand2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { DemoModeBadge } from '@/components/shared/DemoModeBadge';
import { Logo } from '@/components/shared/Logo';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { useDemo } from '@/context/DemoContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { getErrorMessage } from '@/services/api';

const schema = z.object({
  email: z.string().trim().min(1, 'Please enter your email').email('Enter a valid email address'),
  password: z.string().min(1, 'Please enter your password'),
});
type LoginValues = z.infer<typeof schema>;

// Public demo credentials for the hackathon — not real secrets.
const DEMO_CREDENTIALS = { email: 'admin@solarmitra.demo', password: 'demo123' };

export function AdminLoginPage() {
  useDocumentTitle('Operator login');
  const { login, status } = useAuth();
  const { demoMode } = useDemo();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const from = (location.state as { from?: string } | null)?.from ?? '/admin/dashboard';

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<LoginValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  if (status === 'authenticated') return <Navigate to={from} replace />;

  const onSubmit = async (values: LoginValues) => {
    setError(null);
    try {
      await login(values.email, values.password);
      toast.success('Welcome back to the operator console');
      navigate(from, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Sign in failed. Please try again.'));
    }
  };

  const fillDemo = () => {
    setValue('email', DEMO_CREDENTIALS.email, { shouldValidate: true });
    setValue('password', DEMO_CREDENTIALS.password, { shouldValidate: true });
  };

  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-forest-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-solar-grid opacity-20" aria-hidden="true" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-solar-400/20 blur-3xl" aria-hidden="true" />
        <Logo tone="light" showTagline tagline="Operator Console" className="relative" />
        <div className="relative max-w-md">
          <h1 className="text-4xl font-extrabold leading-tight">Clean Energy Transition Dashboard</h1>
          <p className="mt-4 text-forest-100/80">Monitor solar adoption, green financing, and climate impact across communities.</p>
          <ul className="mt-8 space-y-3 text-sm">
            {[
              { icon: SolarPanel, text: 'Review solar + loan applications in one queue' },
              { icon: ShieldCheck, text: 'Verified, MNRE-empanelled vendor network' },
              { icon: Leaf, text: 'Estimated climate impact of every green loan' },
            ].map((item) => (
              <li key={item.text} className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
                  <item.icon className="h-4 w-4 text-solar-300" aria-hidden="true" />
                </span>
                {item.text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-forest-300">SANKALP by Satin Finserv — The Climate Edition</p>
      </section>

      <section className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <Link to="/" className="mb-10 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to home
          </Link>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-extrabold text-slate-900">Operator sign in</h2>
            <DemoModeBadge />
          </div>
          <p className="mt-1 text-sm text-slate-500">Access the Satin Finserv green-finance console.</p>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 space-y-4">
            <Field id="admin-email" label="Email" error={errors.email?.message}>
              <Input id="admin-email" type="email" autoComplete="username" prefix={<Mail className="h-4 w-4" aria-hidden="true" />} invalid={!!errors.email} {...register('email')} />
            </Field>
            <Field id="admin-password" label="Password" error={errors.password?.message}>
              <Input id="admin-password" type="password" autoComplete="current-password" prefix={<KeyRound className="h-4 w-4" aria-hidden="true" />} invalid={!!errors.password} {...register('password')} />
            </Field>
            {error && (
              <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                {error}
              </p>
            )}
            <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
              {!isSubmitting && <LogIn className="h-4 w-4" aria-hidden="true" />} Sign in
            </Button>
          </form>

          {demoMode && (
            <div className="mt-6 rounded-2xl border border-dashed border-solar-300 bg-solar-50 p-4 text-sm">
              <p className="font-bold text-solar-900">Demo credentials (hackathon only)</p>
              <p className="mt-1 font-mono text-xs text-solar-900">
                {DEMO_CREDENTIALS.email}
                <br />
                {DEMO_CREDENTIALS.password}
              </p>
              <Button variant="white" size="sm" className="mt-3" onClick={fillDemo}>
                <Wand2 className="h-4 w-4" aria-hidden="true" /> Use demo credentials
              </Button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
