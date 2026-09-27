import { api, unwrap } from './api';

export interface HealthStatus {
  status: string;
  demoMode: boolean;
  database: 'demo' | 'connected' | 'fallback-demo';
}

export const fetchHealth = () => unwrap<HealthStatus>(api.get('/health', { timeout: 5000 }));

export const resetDemoData = () => unwrap<{ reset: boolean }>(api.post('/demo/reset'));
