import { AnimatePresence, motion } from 'framer-motion';
import {
  ClipboardList,
  FileText,
  IndianRupee,
  LayoutDashboard,
  Leaf,
  LogOut,
  Menu,
  Settings,
  Smartphone,
  Store,
  X,
} from 'lucide-react';
import { Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { DemoModeBadge } from '@/components/shared/DemoModeBadge';
import { Logo } from '@/components/shared/Logo';
import { FullPageLoader } from '@/components/shared/States';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/utils/cn';

const NAV = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/leads', label: 'Leads', icon: ClipboardList },
  { to: '/admin/applications', label: 'Applications', icon: FileText },
  { to: '/admin/vendors', label: 'Vendors', icon: Store },
  { to: '/admin/analytics', label: 'Climate Impact', icon: Leaf },
  { to: '/admin/money-flow', label: 'Money Flow', icon: IndianRupee },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="flex h-full flex-col">
      <div className="px-5 py-5">
        <Link to="/admin/dashboard" onClick={onNavigate} aria-label="Dashboard home">
          <Logo tone="light" showTagline tagline="Operator Console" />
        </Link>
      </div>
      <nav className="flex-1 space-y-1 px-3" aria-label="Operator">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
                isActive ? 'bg-white text-forest-900 shadow-sm' : 'text-forest-100 hover:bg-white/10 hover:text-white',
              )
            }
          >
            <item.icon className="h-[18px] w-[18px]" aria-hidden="true" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="space-y-3 p-4">
        <Link
          to="/consumer"
          className="flex items-center gap-2 rounded-xl border border-white/15 px-3 py-2.5 text-sm font-semibold text-forest-50 hover:bg-white/10"
        >
          <Smartphone className="h-4 w-4" aria-hidden="true" /> Open consumer app
        </Link>
        <div className="flex items-center gap-3 rounded-2xl bg-white/5 p-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-solar-400 text-sm font-bold text-forest-950" aria-hidden="true">
            {user?.name?.charAt(0) ?? 'O'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{user?.name ?? 'Operator'}</p>
            <p className="truncate text-xs text-forest-200">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              logout();
              navigate('/admin/login');
            }}
            className="rounded-lg p-2 text-forest-100 hover:bg-white/10 hover:text-white"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setDrawerOpen(false), [pathname]);

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-forest-950 lg:block">
        <SidebarContent />
      </aside>

      <AnimatePresence>
        {drawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div className="absolute inset-0 bg-black/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawerOpen(false)} />
            <motion.aside
              className="absolute inset-y-0 left-0 w-72 bg-forest-950"
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            >
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="absolute right-3 top-5 rounded-lg p-2 text-forest-100 hover:bg-white/10"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
              <SidebarContent onNavigate={() => setDrawerOpen(false)} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
          <button type="button" onClick={() => setDrawerOpen(true)} className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 lg:hidden" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <p className="text-sm font-semibold text-slate-500">
            SANKALP · <span className="text-slate-800">Satin Finserv Green Finance</span>
          </p>
          <div className="ml-auto flex items-center gap-3">
            <DemoModeBadge />
          </div>
        </header>
        <main className="mx-auto max-w-[1400px] p-4 sm:p-6 lg:p-8">
          <Suspense fallback={<FullPageLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
