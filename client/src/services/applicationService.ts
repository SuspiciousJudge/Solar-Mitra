import type {
  Application,
  ApplicationDetail,
  ApplicationStatus,
  ApplicationView,
  DuplicateWarning,
  LeadQuery,
  NewApplicationPayload,
  Paginated,
  RejectionReason,
  SubmittedApplication,
  TrackedApplication,
} from '@/types';
import { api, isDemoFallbackEnabled, isNetworkError, unwrap } from './api';
import type { AssignmentInput } from './leadService';

const cleanParams = (query: LeadQuery = {}): Record<string, string> => {
  const params: Record<string, string> = {};
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (Array.isArray(value)) {
      if (value.length) params[key] = value.join(',');
      return;
    }
    params[key] = String(value);
  });
  return params;
};

export async function submitApplication(payload: NewApplicationPayload): Promise<SubmittedApplication> {
  try {
    const app = await unwrap<Application>(api.post('/applications', payload));
    return { id: app.id, status: app.status, createdAt: app.createdAt };
  } catch (error) {
    // Keeps a live demo going if the API drops; clearly flagged as offline.
    if (isNetworkError(error) && isDemoFallbackEnabled()) {
      const id = `SM-${new Date().getFullYear()}-${Math.floor(2000 + Math.random() * 8000)}`;
      return { id, status: 'Pending Verification', createdAt: new Date().toISOString(), offline: true };
    }
    throw error;
  }
}

/** Public, privacy-safe tracking endpoint: the household polls it by application ID. */
export const trackApplication = (id: string) =>
  unwrap<TrackedApplication>(api.get(`/applications/${encodeURIComponent(id)}/track`));

export const fetchApplications = (query: LeadQuery = {}) =>
  unwrap<Paginated<ApplicationView>>(api.get('/applications', { params: cleanParams(query) }));

export const fetchApplication = (id: string) =>
  unwrap<ApplicationDetail>(api.get(`/applications/${encodeURIComponent(id)}`));

export const updateApplicationStatus = (id: string, status: ApplicationStatus, note?: string, reason?: RejectionReason) =>
  unwrap<Application>(api.patch(`/applications/${encodeURIComponent(id)}/status`, { status, note, reason }));

export const assignApplication = (id: string, input: AssignmentInput) =>
  unwrap<ApplicationView>(api.patch(`/applications/${encodeURIComponent(id)}/assign`, input));

export const fetchDuplicates = (query: { phone?: string; consumerNumber?: string }) =>
  unwrap<DuplicateWarning[]>(api.get('/applications/duplicates', { params: query }));

export function applicationsExportUrl(query: LeadQuery = {}): string {
  return `/api/applications/export.csv?${new URLSearchParams(cleanParams(query)).toString()}`;
}
