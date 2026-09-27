import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { isDemoFallbackEnabled } from '@/services/api';
import { fetchHealth, resetDemoData } from '@/services/demoService';
import { useConsumer } from './ConsumerContext';

interface DemoContextValue {
  /** True when the server is serving seeded demo data (or the client runs offline in demo mode). */
  demoMode: boolean;
  apiReachable: boolean | null;
  refreshStatus: () => Promise<void>;
  resetDemo: () => Promise<void>;
}

const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const { resetConsumer } = useConsumer();
  const [demoMode, setDemoMode] = useState(isDemoFallbackEnabled());
  const [apiReachable, setApiReachable] = useState<boolean | null>(null);

  const refreshStatus = useCallback(async () => {
    try {
      const health = await fetchHealth();
      setDemoMode(health.demoMode);
      setApiReachable(true);
    } catch {
      setApiReachable(false);
      setDemoMode(isDemoFallbackEnabled());
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  const resetDemo = useCallback(async () => {
    await resetDemoData();
    resetConsumer();
  }, [resetConsumer]);

  const value = useMemo(() => ({ demoMode, apiReachable, refreshStatus, resetDemo }), [demoMode, apiReachable, refreshStatus, resetDemo]);
  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) throw new Error('useDemo must be used inside DemoProvider');
  return context;
}
