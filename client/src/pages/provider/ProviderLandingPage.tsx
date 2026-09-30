import { ArrowRight, BadgeCheck, ClipboardList, FileText, ShieldCheck, SolarPanel, Sun } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/shared/Logo';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { DOCUMENT_TYPE_LABELS } from '@/utils/providerRules';

const BENEFITS = [
  { icon: SolarPanel, title: 'Household leads in your service area', text: 'Show up in the consumer installer list once you are verified and active.' },
  { icon: ShieldCheck, title: 'Trusted SolarMitra badge', text: 'Operators check GST, PAN, electrical licence and DISCOM empanelment before you go live.' },
  { icon: BadgeCheck, title: 'Green-finance payouts', text: 'Approved partners receive vendor payouts against financed installations.' },
];

const ELIGIBILITY = [
  'Registered business in India with a valid GSTIN and PAN',
  'Electrical contractor licence that is still valid',
  'At least some completed rooftop solar work and two customer references',
  'Service coverage in one or more states / districts',
  'Current or savings account in the business name for payouts',
];

const DOCS = ['gst_certificate', 'pan_card', 'electrical_licence', 'cancelled_cheque', 'signatory_id'] as const;

export function ProviderLandingPage() {
  useDocumentTitle('Become a SolarMitra partner');
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-100">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" aria-label="Home">
            <Logo />
          </Link>
          <div className="flex gap-2">
            <Link to="/provider/login" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
              Login
            </Link>
            <Link to="/provider/register" className={buttonVariants({ size: 'sm' })}>
              Apply now
            </Link>
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-forest-700">SolarMitra partner programme</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">Become a SolarMitra Partner</h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-600">
          Join the verified installer network that households see at the end of their solar journey. Demo walkthrough — GST/PAN/penny-drop checks are simulated.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/provider/register" className={buttonVariants({ size: 'lg', variant: 'solar' })}>
            <Sun className="h-5 w-5" aria-hidden="true" /> Apply now
          </Link>
          <Link to="/provider/login" className={buttonVariants({ size: 'lg', variant: 'outline' })}>
            Partner login <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {BENEFITS.map((item) => (
            <Card key={item.title} className="p-5">
              <item.icon className="h-6 w-6 text-forest-700" aria-hidden="true" />
              <h2 className="mt-3 font-bold text-slate-900">{item.title}</h2>
              <p className="mt-1 text-sm text-slate-600">{item.text}</p>
            </Card>
          ))}
        </div>

        <div className="mt-14 grid gap-8 lg:grid-cols-2">
          <section>
            <h2 className="flex items-center gap-2 text-xl font-extrabold text-slate-900">
              <ClipboardList className="h-5 w-5 text-forest-700" aria-hidden="true" /> Eligibility
            </h2>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              {ELIGIBILITY.map((line) => (
                <li key={line} className="flex gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-forest-600" />
                  {line}
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="flex items-center gap-2 text-xl font-extrabold text-slate-900">
              <FileText className="h-5 w-5 text-forest-700" aria-hidden="true" /> Required documents
            </h2>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              {DOCS.map((type) => (
                <li key={type} className="rounded-xl bg-slate-50 px-3 py-2 font-medium">
                  {DOCUMENT_TYPE_LABELS[type]}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-slate-500">PDF, JPG or PNG · max 5 MB each. Incorporation / partnership deed and DISCOM letters as applicable.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
