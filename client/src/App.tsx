import { lazy, Suspense, type ComponentType } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '@/components/shared/ProtectedRoute';
import { ScrollToTop } from '@/components/shared/ScrollToTop';
import { FullPageLoader } from '@/components/shared/States';
import { ConsumerLayout } from '@/layouts/ConsumerLayout';
import { LandingPage } from '@/pages/LandingPage';

/** Lazy-load a named export so each screen ships as its own chunk. */
function lazyNamed<T extends Record<string, ComponentType>>(loader: () => Promise<T>, name: keyof T) {
  return lazy(() => loader().then((module) => ({ default: module[name] })));
}

const LanguageSelectPage = lazyNamed(() => import('@/pages/consumer/LanguageSelectPage'), 'LanguageSelectPage');
const OnboardingPage = lazyNamed(() => import('@/pages/consumer/OnboardingPage'), 'OnboardingPage');
const AuditPage = lazyNamed(() => import('@/pages/consumer/AuditPage'), 'AuditPage');
const SubsidyPage = lazyNamed(() => import('@/pages/consumer/SubsidyPage'), 'SubsidyPage');
const FinancingPage = lazyNamed(() => import('@/pages/consumer/FinancingPage'), 'FinancingPage');
const VendorsPage = lazyNamed(() => import('@/pages/consumer/VendorsPage'), 'VendorsPage');
const ApplicationSuccessPage = lazyNamed(() => import('@/pages/consumer/ApplicationSuccessPage'), 'ApplicationSuccessPage');
const TrackApplicationPage = lazyNamed(() => import('@/pages/consumer/TrackApplicationPage'), 'TrackApplicationPage');
const LoginPage = lazyNamed(() => import('@/pages/auth/LoginPage'), 'LoginPage');

const AdminLayout = lazyNamed(() => import('@/layouts/AdminLayout'), 'AdminLayout');
const AdminLoginPage = lazyNamed(() => import('@/pages/admin/AdminLoginPage'), 'AdminLoginPage');
const DashboardPage = lazyNamed(() => import('@/pages/admin/DashboardPage'), 'DashboardPage');
const LeadsPage = lazyNamed(() => import('@/pages/admin/LeadsPage'), 'LeadsPage');
const ApplicationsPage = lazyNamed(() => import('@/pages/admin/ApplicationsPage'), 'ApplicationsPage');
const ApplicationDetailPage = lazyNamed(() => import('@/pages/admin/ApplicationDetailPage'), 'ApplicationDetailPage');
const VendorsAdminPage = lazyNamed(() => import('@/pages/admin/VendorsAdminPage'), 'VendorsAdminPage');
const AnalyticsPage = lazyNamed(() => import('@/pages/admin/AnalyticsPage'), 'AnalyticsPage');
const SettingsPage = lazyNamed(() => import('@/pages/admin/SettingsPage'), 'SettingsPage');
const NotFoundPage = lazyNamed(() => import('@/pages/NotFoundPage'), 'NotFoundPage');

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<FullPageLoader />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />

          <Route path="/consumer" element={<ConsumerLayout />}>
            <Route index element={<LanguageSelectPage />} />
            <Route path="onboarding" element={<OnboardingPage />} />
            <Route path="audit" element={<AuditPage />} />
            <Route path="subsidy" element={<SubsidyPage />} />
            <Route path="financing" element={<FinancingPage />} />
            <Route path="vendors" element={<VendorsPage />} />
            <Route path="application-success" element={<ApplicationSuccessPage />} />
            <Route path="track" element={<TrackApplicationPage />} />
          </Route>

          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin" element={<ProtectedRoute />}>
            <Route element={<AdminLayout />}>
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="leads" element={<LeadsPage />} />
              <Route path="applications" element={<ApplicationsPage />} />
              <Route path="applications/:id" element={<ApplicationDetailPage />} />
              <Route path="vendors" element={<VendorsAdminPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </>
  );
}
