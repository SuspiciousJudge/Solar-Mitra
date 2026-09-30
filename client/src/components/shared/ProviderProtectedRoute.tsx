import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useProviderAuth } from '@/context/ProviderAuthContext';
import { FullPageLoader } from './States';

export function ProviderProtectedRoute() {
  const { status, user } = useProviderAuth();
  const location = useLocation();
  if (status === 'checking') return <FullPageLoader />;
  if (status === 'anonymous' || user?.role !== 'provider') {
    return <Navigate to="/provider/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}
