import type {
  Application,
  ApplicationDetail,
  ApplicationStatus,
  LeadQuery,
  NewApplicationPayload,
  Paginated,
  SubmittedApplication,
  TrackedApplication,
} from '@/types';
import { api, isDemoFallbackEnabled, isNetworkError, unwrap } from './api';

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

export const trackApplication = (id: string) =>
  unwrap<TrackedApplication>(api.get(`/applications/${encodeURIComponent(id)}/track`));

export const fetchApplications = (query: LeadQuery = {}) =>
  unwrap<Paginated<Application>>(api.get('/applications', { params: query }));

export const fetchApplication = (id: string) =>
  unwrap<ApplicationDetail>(api.get(`/applications/${encodeURIComponent(id)}`));

export const updateApplicationStatus = (id: string, status: ApplicationStatus, note?: string) =>
  unwrap<Application>(api.patch(`/applications/${encodeURIComponent(id)}/status`, { status, note }));
