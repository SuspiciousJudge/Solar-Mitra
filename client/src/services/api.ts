import axios, { AxiosError } from 'axios';
import type { ApiFailure, ApiSuccess } from '@/types';

export const TOKEN_STORAGE_KEY = 'solarmitra.adminToken';
export const SESSION_EXPIRED_EVENT = 'solarmitra:session-expired';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 12000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiFailure>) => {
    const hadToken = Boolean(error.config?.headers?.Authorization);
    const isLogin = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && hadToken && !isLogin) {
      window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT, { detail: error.response.data?.message }));
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
