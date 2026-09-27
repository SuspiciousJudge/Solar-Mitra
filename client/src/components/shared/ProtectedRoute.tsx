import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { FullPageLoader } from './States';

export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'checking') return <FullPageLoader />;
  if (status === 'anonymous') return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}
