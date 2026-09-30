import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { PROVIDER_SESSION_EXPIRED_EVENT, PROVIDER_TOKEN_STORAGE_KEY } from '@/services/api';
import * as providerService from '@/services/providerService';
import type { AuthUser } from '@/types';

type AuthStatus = 'checking' | 'authenticated' | 'anonymous';

interface ProviderAuthValue {
  user: AuthUser | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: Parameters<typeof providerService.registerProvider>[0]) => Promise<void>;
  logout: () => void;
}

const ProviderAuthContext = createContext<ProviderAuthValue | null>(null);

export function ProviderAuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>(() => (localStorage.getItem(PROVIDER_TOKEN_STORAGE_KEY) ? 'checking' : 'anonymous'));

  const logout = useCallback(() => {
    localStorage.removeItem(PROVIDER_TOKEN_STORAGE_KEY);
    setUser(null);
    setStatus('anonymous');
  }, []);

  useEffect(() => {
    if (!localStorage.getItem(PROVIDER_TOKEN_STORAGE_KEY)) return;
    providerService
      .fetchProviderMe()
      .then((me) => {
        setUser(me);
        setStatus('authenticated');
      })
      .catch(() => logout());
  }, [logout]);

  useEffect(() => {
    const onExpired = (event: Event) => {
      logout();
      toast.error((event as CustomEvent<string | undefined>).detail || 'Your session has expired. Please sign in again.');
      navigate('/provider/login?expired=1', { replace: true });
    };
    window.addEventListener(PROVIDER_SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(PROVIDER_SESSION_EXPIRED_EVENT, onExpired);
  }, [logout, navigate]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await providerService.loginProvider(email, password);
    localStorage.setItem(PROVIDER_TOKEN_STORAGE_KEY, result.token);
    setUser(result.user);
    setStatus('authenticated');
  }, []);

  const register = useCallback(async (payload: Parameters<typeof providerService.registerProvider>[0]) => {
    const result = await providerService.registerProvider(payload);
    localStorage.setItem(PROVIDER_TOKEN_STORAGE_KEY, result.token);
    setUser(result.user);
    setStatus('authenticated');
  }, []);

  const value = useMemo(() => ({ user, status, login, register, logout }), [user, status, login, register, logout]);
  return <ProviderAuthContext.Provider value={value}>{children}</ProviderAuthContext.Provider>;
}

export function useProviderAuth() {
  const context = useContext(ProviderAuthContext);
  if (!context) throw new Error('useProviderAuth must be used inside ProviderAuthProvider');
  return context;
}
