import type { Application, ApplicationStatus, LeadQuery, Paginated } from '@/types';
import { api, unwrap } from './api';

export const fetchLeads = (query: LeadQuery = {}) => unwrap<Paginated<Application>>(api.get('/leads', { params: query }));

export const updateLeadStatus = (id: string, status: ApplicationStatus, note?: string) =>
  unwrap<Application>(api.patch(`/leads/${encodeURIComponent(id)}/status`, { status, note }));
