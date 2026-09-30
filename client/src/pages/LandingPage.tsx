import { motion } from 'framer-motion';
import {
  ArrowDown,
  ArrowRight,
  BadgeCheck,
  Banknote,
  CircleCheck,
  FileQuestion,
  IndianRupee,
  Landmark,
  LayoutDashboard,
  Leaf,
  MapPinOff,
  Receipt,
  ShieldCheck,
  SolarPanel,
  Sparkles,
  Store,
  Sun,
  Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/shared/Logo';
import { buttonVariants } from '@/components/ui/button';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { formatINR } from '@/utils/format';
import { calculateLoanSummary, calculateSolarRecommendation } from '@/utils/solarCalculator';

const FLOW = [
  { icon: Receipt, title: 'Electricity Bill', text: 'Upload or type your monthly usage' },
  { icon: SolarPanel, title: 'Solar Audit', text: 'Right-sized rooftop recommendation' },
  { icon: Landmark, title: 'Government Subsidy', text: 'Central + state support estimated' },
  { icon: Banknote, title: 'Affordable EMI', text: 'Green loan by Satin Finserv' },
  { icon: BadgeCheck, title: 'Verified Vendor', text: 'MNRE-empanelled local installers' },
  { icon: Leaf, title: 'Clean Energy', text: 'Lower bills, lower emissions' },
];

const PROBLEMS = [
  { icon: IndianRupee, title: 'High electricity costs', text: 'Bills eat a growing share of rural and semi-urban household income.' },
  { icon: FileQuestion, title: 'Awareness & subsidy complexity', text: 'Families rarely know what size system they need or what support applies.' },
  { icon: Banknote, title: 'Upfront cost & financing friction', text: 'Even after subsidy, paying at once is out of reach for many homes.' },
  { icon: MapPinOff, title: 'Fragmented vendor discovery', text: 'Trustworthy, empanelled installers are hard to find locally.' },
];

const FUNNEL = ['Household', 'Solar Intent', 'Solar Audit', 'Financing Need', 'Green Loan', 'Vendor', 'Installation', 'Climate Impact'];

// Hero figures come from the same calculator the app uses (demo assumptions).
const demo = calculateSolarRecommendation(350, 'Uttar Pradesh', 2800);
const demoEmi = calculateLoanSummary(demo.netCost, 7.5, 36).emi;

export function LandingPage() {
  useDocumentTitle('');
  return (
    <div className="min-h-screen overflow-x-hidden bg-white">
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/85 backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6" aria-label="Main">
          <Link to="/" aria-label="SolarMitra home">
            <Logo />
          </Link>
          <div className="hidden items-center gap-7 text-sm font-semibold text-slate-600 md:flex">
            <a href="#how-it-works" className="hover:text-forest-700">How it works</a>
            <a href="#problem" className="hover:text-forest-700">Why SolarMitra</a>
            <a href="#impact" className="hover:text-forest-700">For lenders</a>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/provider" className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'hidden sm:inline-flex' })}>
              For installers
            </Link>
            <Link to="/admin/login" className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'hidden sm:inline-flex' })}>
              Operator login
            </Link>
            <Link to="/consumer" className={buttonVariants({ size: 'sm' })}>
              Start audit
            </Link>
          </div>
        </nav>
      </header>

      <main>
        <section className="relative isolate overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-forest-50/80 via-white to-white" />
          <div className="absolute -right-40 -top-40 -z-10 h-[520px] w-[520px] rounded-full bg-solar-200/40 blur-3xl" aria-hidden="true" />
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pb-24 lg:pt-20">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <span className="inline-flex items-center gap-2 rounded-full border border-forest-200 bg-white px-3 py-1.5 text-xs font-semibold text-forest-800 shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-solar-500" aria-hidden="true" />
                Built for sustainable cities &amp; rural energy transition
              </span>
              <h1 className="mt-6 text-4xl font-extrabold leading-[1.05] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                Your Roof Can Power <span className="bg-gradient-to-r from-forest-700 to-forest-500 bg-clip-text text-transparent">Your Future.</span>
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
                SolarMitra helps households discover rooftop solar, understand subsidies, access affordable financing, and connect with verified installers.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to="/consumer" className={buttonVariants({ size: 'xl', variant: 'solar' })}>
                  <Sun className="h-5 w-5" aria-hidden="true" /> Start My Solar Audit
                </Link>
                <Link to="/admin/login" className={buttonVariants({ size: 'xl', variant: 'outline' })}>
                  <LayoutDashboard className="h-5 w-5" aria-hidden="true" /> View Demo Dashboard
                </Link>
              </div>
              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-slate-600">
                {['English · हिंदी · ગુજરાતી · தமிழ்', 'Subsidy-aware estimates', 'MNRE-empanelled partners'].map((item) => (
                  <li key={item} className="flex items-center gap-1.5">
                    <CircleCheck className="h-4 w-4 text-forest-600" aria-hidden="true" /> {item}
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div className="relative" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.1 }}>
              <div className="overflow-hidden rounded-[2rem] shadow-lift ring-1 ring-black/5">
                <img
                  src="/images/hero-rooftop.jpg"
                  alt="A mother and son stand on their rural home's roof beside newly installed solar panels at sunrise"
                  className="aspect-[4/3] w-full object-cover"
                  width={1400}
                  height={933}
                />
              </div>
              <motion.div
                className="absolute -left-3 bottom-6 rounded-2xl bg-white p-4 shadow-lift ring-1 ring-black/5 sm:-left-8"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                <p className="text-xs font-semibold text-slate-500">Estimated net cost · {demo.recommendedKW} kW</p>
                <p className="text-2xl font-extrabold tabular-nums text-forest-800">{formatINR(demo.netCost)}</p>
                <p className="text-xs text-slate-500 line-through">{formatINR(demo.marketCost)}</p>
              </motion.div>
              <motion.div
                className="absolute -right-2 top-6 rounded-2xl bg-forest-800 p-4 text-white shadow-lift sm:-right-6"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 }}
              >
                <p className="text-xs font-semibold text-forest-100">Illustrative EMI</p>
                <p className="text-2xl font-extrabold tabular-nums">
                  {formatINR(demoEmi)}
                  <span className="text-sm font-semibold text-forest-200">/mo</span>
                </p>
                <p className="text-xs text-solar-300">vs {formatINR(2800)} bill today</p>
              </motion.div>
            </motion.div>
          </div>
        </section>

        <section id="how-it-works" className="border-y border-slate-100 bg-slate-50/70 py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <p className="text-sm font-bold uppercase tracking-wider text-forest-700">One continuous journey</p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">From electricity bill to clean energy</h2>
            </div>
            <ol className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              {FLOW.map((step, index) => (
                <motion.li
                  key={step.title}
                  className="relative"
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ delay: index * 0.07 }}
                >
                  <div className="h-full rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-forest-50 text-forest-700">
                      <step.icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <p className="mt-4 text-xs font-bold text-solar-600">Step {index + 1}</p>
                    <h3 className="mt-0.5 font-bold text-slate-900">{step.title}</h3>
                    <p className="mt-1 text-sm text-slate-500">{step.text}</p>
                  </div>
                  {index < FLOW.length - 1 && (
                    <>
                      <ArrowRight className="absolute -right-3 top-1/2 z-10 hidden h-5 w-5 -translate-y-1/2 rounded-full bg-white text-forest-500 lg:block" aria-hidden="true" />
                      <ArrowDown className="mx-auto my-1 h-5 w-5 text-forest-400 sm:hidden" aria-hidden="true" />
                    </>
                  )}
                </motion.li>
              ))}
            </ol>
          </div>
        </section>

        <section id="problem" className="py-16 lg:py-20">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-2">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-forest-700">The problem</p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Solar adoption stalls long before installation</h2>
              <p className="mt-4 text-lg text-slate-600">
                Households are told to “install solar” — but nobody tells them how big, how much, what support applies, how to pay, or whom to trust.
              </p>
              <div className="mt-8 rounded-3xl bg-gradient-to-br from-forest-800 to-forest-950 p-6 text-white">
                <p className="text-sm font-bold uppercase tracking-wider text-solar-300">The SolarMitra answer</p>
                <p className="mt-3 text-lg leading-relaxed text-forest-50">
                  “Based on your electricity usage, here’s the solar system you may need, the estimated subsidy, the amount you may need to finance, an illustrative EMI, and verified local installers.”
                </p>
                <p className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                  {['Solar Discovery', 'Subsidy', 'Financing', 'Vendor', 'Climate Impact'].map((item) => (
                    <span key={item} className="rounded-full bg-white/10 px-3 py-1">{item}</span>
                  ))}
                </p>
              </div>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2">
              {PROBLEMS.map((problem) => (
                <li key={problem.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-solar-50 text-solar-700">
                    <problem.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 font-bold text-slate-900">{problem.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{problem.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="impact" className="bg-forest-950 py-16 text-white lg:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div className="max-w-2xl">
                <p className="text-sm font-bold uppercase tracking-wider text-solar-300">For Satin Finserv</p>
                <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">A green-finance funnel with measurable climate impact</h2>
              </div>
              <Link to="/admin/login" className={buttonVariants({ variant: 'solar', size: 'lg' })}>
                Open operator dashboard <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <ol className="mt-10 flex flex-wrap items-center gap-2">
              {FUNNEL.map((stage, index) => (
                <li key={stage} className="flex items-center gap-2">
                  <span className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold">{stage}</span>
                  {index < FUNNEL.length - 1 && <ArrowRight className="h-4 w-4 text-solar-400" aria-hidden="true" />}
                </li>
              ))}
            </ol>
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                { icon: Zap, title: 'Qualified demand', text: 'Every lead arrives with usage, system size and financing need.' },
                { icon: ShieldCheck, title: 'Lower risk', text: 'Loans tied to verified vendors and subsidy-backed assets.' },
                { icon: Store, title: 'Local ecosystem', text: 'Installers gain customers; households gain trust.' },
              ].map((item) => (
                <div key={item.title} className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
                  <item.icon className="h-6 w-6 text-solar-300" aria-hidden="true" />
                  <h3 className="mt-3 font-bold">{item.title}</h3>
                  <p className="mt-1 text-sm text-forest-100/80">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-100 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 text-sm text-slate-500 sm:flex-row sm:px-6">
          <Logo />
          <p className="text-center">SANKALP by Satin Finserv — The Climate Edition · Hackathon prototype with demo policy assumptions.</p>
        </div>
      </footer>
    </div>
  );
}
