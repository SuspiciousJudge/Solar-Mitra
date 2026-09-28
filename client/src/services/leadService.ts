import type { Application, ApplicationStatus, ApplicationView, LeadQuery, Paginated, RejectionReason } from '@/types';
import { api, unwrap } from './api';

export interface AssignmentInput {
  userId?: string | null;
  assignToMe?: boolean;
}

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

export const fetchLeads = (query: LeadQuery = {}) => unwrap<Paginated<ApplicationView>>(api.get('/leads', { params: cleanParams(query) }));

export const updateLeadStatus = (id: string, status: ApplicationStatus, note?: string, reason?: RejectionReason) =>
  unwrap<Application>(api.patch(`/leads/${encodeURIComponent(id)}/status`, { status, note, reason }));

export const assignLead = (id: string, input: AssignmentInput) =>
  unwrap<ApplicationView>(api.patch(`/leads/${encodeURIComponent(id)}/assign`, input));

/** CSV export of exactly the filtered rows currently on screen. */
export function leadsExportUrl(query: LeadQuery = {}): string {
  return `/api/leads/export.csv?${new URLSearchParams(cleanParams(query)).toString()}`;
}
