import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { SESSION_EXPIRED_EVENT, TOKEN_STORAGE_KEY } from '@/services/api';
import * as authService from '@/services/authService';
import type { AuthUser } from '@/types';

type AuthStatus = 'checking' | 'authenticated' | 'anonymous';

interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>(() => (localStorage.getItem(TOKEN_STORAGE_KEY) ? 'checking' : 'anonymous'));

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setUser(null);
    setStatus('anonymous');
  }, []);

  // Validate a stored token on first load.
  useEffect(() => {
    if (!localStorage.getItem(TOKEN_STORAGE_KEY)) return;
    authService
      .fetchMe()
      .then((me) => {
        setUser(me);
        setStatus('authenticated');
      })
      .catch(() => logout());
  }, [logout]);

  // Any 401 on an authenticated request (e.g. expired JWT) signs the operator out.
  useEffect(() => {
    const onExpired = (event: Event) => {
      logout();
      toast.error((event as CustomEvent<string | undefined>).detail || 'Your session has expired. Please sign in again.');
      navigate('/admin/login', { replace: true });
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [logout, navigate]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await authService.login(email, password);
    localStorage.setItem(TOKEN_STORAGE_KEY, result.token);
    setUser(result.user);
    setStatus('authenticated');
  }, []);

  const value = useMemo(() => ({ user, status, login, logout }), [user, status, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
