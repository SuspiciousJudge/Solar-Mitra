import axios, { AxiosError } from 'axios';
import type { ApiFailure, ApiSuccess } from '@/types';

export const TOKEN_STORAGE_KEY = 'solarmitra.adminToken';
export const PROVIDER_TOKEN_STORAGE_KEY = 'solarmitra.providerToken';
export const SESSION_EXPIRED_EVENT = 'solarmitra:session-expired';
export const PROVIDER_SESSION_EXPIRED_EVENT = 'solarmitra:provider-session-expired';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 12000,
  headers: { 'Content-Type': 'application/json' },
});

function isProviderPath(url: string): boolean {
  return url.includes('/provider') && !url.includes('/operator');
}

api.interceptors.request.use((config) => {
  const url = config.url ?? '';
  const providerToken = localStorage.getItem(PROVIDER_TOKEN_STORAGE_KEY);
  const adminToken = localStorage.getItem(TOKEN_STORAGE_KEY);
  const token = isProviderPath(url) ? providerToken ?? adminToken : adminToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiFailure>) => {
    const hadToken = Boolean(error.config?.headers?.Authorization);
    const url = error.config?.url ?? '';
    const isLogin = url.includes('/auth/login');
    if (error.response?.status === 401 && hadToken && !isLogin) {
      const eventName = isProviderPath(url) ? PROVIDER_SESSION_EXPIRED_EVENT : SESSION_EXPIRED_EVENT;
      window.dispatchEvent(new CustomEvent(eventName, { detail: error.response.data?.message }));
    }
    return Promise.reject(error);
  },
);

/** Unwraps `{ success, data }` so services return plain data. */
export async function unwrap<T>(request: Promise<{ data: ApiSuccess<T> }>): Promise<T> {
  const response = await request;
  return response.data.data;
}

export class ApiUnavailableError extends Error {}

/** Friendly message for any API error — never leaks internal/database details. */
export function getErrorMessage(error: unknown, fallback = "We couldn't load this information. Please try again."): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) return 'We could not reach the SolarMitra server. Please check your connection and try again.';
    const message = (error.response.data as ApiFailure | undefined)?.message;
    if (message && error.response.status < 500) return message;
  }
  return fallback;
}

export const isNetworkError = (error: unknown) => axios.isAxiosError(error) && !error.response;

export const isDemoFallbackEnabled = () => (import.meta.env.VITE_DEMO_MODE ?? 'true') !== 'false';
