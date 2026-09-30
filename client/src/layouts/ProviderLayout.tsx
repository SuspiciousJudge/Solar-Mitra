import { Bell, LogOut, Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { DemoModeBadge } from '@/components/shared/DemoModeBadge';
import { Logo } from '@/components/shared/Logo';
import { useProviderAuth } from '@/context/ProviderAuthContext';
import { useAsync } from '@/hooks/useAsync';
import { fetchProviderNotifications } from '@/services/providerService';
import { cn } from '@/utils/cn';

const NAV = [
  { to: '/provider/application', label: 'Application' },
  { to: '/provider/status', label: 'Status' },
  { to: '/provider/dashboard', label: 'Dashboard' },
];

export function ProviderLayout() {
  const { user, logout } = useProviderAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const notes = useAsync(() => fetchProviderNotifications(), [user?.id]);
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link to="/provider" aria-label="Partner home">
            <Logo showTagline tagline="Partner portal" />
          </Link>
          <nav className="ml-6 hidden items-center gap-1 md:flex" aria-label="Partner">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn('rounded-xl px-3 py-2 text-sm font-semibold', isActive ? 'bg-forest-50 text-forest-800' : 'text-slate-600 hover:bg-slate-100')
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <DemoModeBadge />
            <span className="relative hidden sm:inline-flex" title="Notifications">
              <Bell className="h-5 w-5 text-slate-500" aria-hidden="true" />
              {(notes.data?.length ?? 0) > 0 && <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-solar-500" />}
            </span>
            <span className="hidden text-sm font-semibold text-slate-700 sm:inline">{user?.name}</span>
            <button
              type="button"
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
              aria-label="Sign out"
              onClick={() => {
                logout();
                navigate('/provider/login');
              }}
            >
              <LogOut className="h-4 w-4" />
            </button>
            <button type="button" className="rounded-lg p-2 md:hidden" aria-label="Open menu" onClick={() => setOpen(true)}>
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-white p-4">
            <button type="button" className="mb-4 rounded-lg p-2" aria-label="Close menu" onClick={() => setOpen(false)}>
              <X className="h-5 w-5" />
            </button>
            {NAV.map((item) => (
              <NavLink key={item.to} to={item.to} className="block rounded-xl px-3 py-2 font-semibold text-slate-700 hover:bg-slate-100">
                {item.label}
              </NavLink>
            ))}
          </aside>
        </div>
      )}
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-10">
        <Outlet />
      </main>
    </div>
  );
}
