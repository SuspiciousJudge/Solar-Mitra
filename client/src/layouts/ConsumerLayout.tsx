import { ArrowUpRight, LayoutDashboard, Smartphone } from 'lucide-react';
import { Link, Outlet } from 'react-router-dom';
import { ConsumerHeader } from '@/components/consumer/ConsumerHeader';
import { Logo } from '@/components/shared/Logo';

/**
 * Mobile-first shell. On phones it fills the viewport; on larger screens the
 * app is presented inside a centred, phone-sized frame (max 480px).
 */
export function ConsumerLayout() {
  return (
    <div className="min-h-[100dvh] bg-slate-50 sm:bg-gradient-to-br sm:from-forest-950 sm:via-forest-900 sm:to-forest-800">
      <div className="pointer-events-none fixed inset-0 hidden bg-solar-grid opacity-40 sm:block" aria-hidden="true" />
      <div className="relative mx-auto flex min-h-[100dvh] max-w-6xl items-center justify-center gap-16 sm:px-6 sm:py-6">
        <aside className="hidden max-w-xs flex-col gap-6 text-forest-50 lg:flex">
          <Logo tone="light" showTagline />
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-solar-300">
              <Smartphone className="h-3.5 w-3.5" aria-hidden="true" /> Consumer app preview
            </p>
            <h2 className="mt-4 text-3xl font-extrabold leading-tight text-white text-balance">From electricity bill to clean energy in minutes.</h2>
            <p className="mt-3 text-sm leading-relaxed text-forest-100/80">
              Built for first-time digital users: vernacular, simple, and honest about estimates.
            </p>
          </div>
          <Link
            to="/admin/login"
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            <LayoutDashboard className="h-4 w-4" aria-hidden="true" /> Operator dashboard
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </aside>

        <div className="relative flex w-full flex-col bg-white sm:h-[min(920px,calc(100dvh-48px))] sm:max-w-[480px] sm:overflow-hidden sm:rounded-[2.75rem] sm:border-[10px] sm:border-forest-950 sm:shadow-phone">
          <ConsumerHeader />
          <main id="consumer-scroll" className="relative flex flex-1 flex-col sm:overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
