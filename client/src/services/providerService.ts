import type { AuthUser, Paginated, Transaction } from '@/types';
import type { ProviderApplication, ProviderLead, ProviderListItem, ProviderStats } from '@/types/provider';
import type { ChecklistKey, DocumentType, ProviderStep } from '@/utils/providerRules';
import { api, unwrap } from './api';

export const registerProvider = (payload: {
  name: string;
  email: string;
  mobile: string;
  password: string;
  confirmPassword: string;
  acceptTerms: true;
  otp: string;
}) => unwrap<{ token: string; user: AuthUser }>(api.post('/provider/auth/register', payload));

export const loginProvider = (email: string, password: string) =>
  unwrap<{ token: string; user: AuthUser }>(api.post('/provider/auth/login', { email, password }));

export const fetchProviderMe = () => unwrap<AuthUser>(api.get('/provider/auth/me'));

export const fetchOwnApplication = () => unwrap<ProviderApplication>(api.get('/provider/application'));

export const saveApplicationStep = (step: ProviderStep, payload: Record<string, unknown>) =>
  unwrap<ProviderApplication>(api.put(`/provider/application/steps/${step}`, payload));

export const submitProviderApplication = () => unwrap<ProviderApplication>(api.post('/provider/application/submit'));

export const resubmitProviderApplication = () => unwrap<ProviderApplication>(api.post('/provider/application/resubmit'));

export async function uploadProviderDocument(type: DocumentType, file: File): Promise<ProviderApplication> {
  const body = new FormData();
  body.append('type', type);
  body.append('file', file);
  return unwrap<ProviderApplication>(
    api.post('/provider/application/documents', body, {
      headers: { 'Content-Type': false as unknown as string },
      timeout: 30000,
    }),
  );
}

export const deleteProviderDocument = (docId: string) =>
  unwrap<ProviderApplication>(api.delete(`/provider/application/documents/${encodeURIComponent(docId)}`));

export async function fetchProviderDocumentBlob(docId: string): Promise<Blob> {
  const response = await api.get(`/provider/documents/${encodeURIComponent(docId)}`, { responseType: 'blob', timeout: 30000 });
  return response.data as Blob;
}

export const fetchProviderLeads = () => unwrap<ProviderLead[]>(api.get('/provider/leads'));

export const updateProviderLead = (id: string, payload: { kind: 'site_visit_done' | 'installation_scheduled' | 'installed'; date: string; note?: string }) =>
  unwrap(api.post(`/provider/leads/${encodeURIComponent(id)}/update`, payload));

export const fetchProviderPayouts = () => unwrap<Transaction[]>(api.get('/provider/payouts'));

export const fetchProviderNotifications = () =>
  unwrap<Array<{ id: string; title: string; body: string; at: string; tone: 'info' | 'warn' }>>(api.get('/provider/notifications'));

export const lookupIfsc = (ifsc: string) =>
  unwrap<{ ifsc: string; known: boolean; bank: string; branch: string; city: string }>(api.get(`/provider/ifsc/${encodeURIComponent(ifsc)}`));

export interface ProviderListQuery {
  status?: string;
  state?: string;
  district?: string;
  businessType?: string;
  search?: string;
  discomEmpanelled?: string;
  hasRiskFlags?: string;
  from?: string;
  to?: string;
  yearsMin?: string;
  yearsMax?: string;
  sortBy?: string;
  order?: string;
  page?: number;
  limit?: number;
}

export const fetchProviderApplications = (params: ProviderListQuery = {}) =>
  unwrap<Paginated<ProviderListItem>>(api.get('/operator/provider-applications', { params }));

export const fetchProviderStats = () => unwrap<ProviderStats>(api.get('/operator/provider-applications/stats'));

export const fetchProviderApplication = (id: string, revealBank = false) =>
  unwrap<ProviderApplication>(api.get(`/operator/provider-applications/${encodeURIComponent(id)}`, { params: revealBank ? { reveal: 'bank' } : undefined }));

export const assignProviderApplication = (id: string, payload: { reviewerId?: string; assignToMe?: boolean }) =>
  unwrap<ProviderApplication>(api.patch(`/operator/provider-applications/${encodeURIComponent(id)}/assign`, payload));

export const patchProviderChecklist = (id: string, payload: { itemKey: ChecklistKey; status: 'pending' | 'pass' | 'fail'; note?: string }) =>
  unwrap<ProviderApplication>(api.patch(`/operator/provider-applications/${encodeURIComponent(id)}/checklist`, payload));

export const verifyProviderDocument = (id: string, docId: string, payload: { verification: 'pending' | 'verified' | 'rejected'; remark?: string }) =>
  unwrap<ProviderApplication>(api.patch(`/operator/provider-applications/${encodeURIComponent(id)}/documents/${encodeURIComponent(docId)}`, payload));

export const requestProviderChanges = (id: string, payload: { fields: string[]; documents: string[]; message: string }) =>
  unwrap<ProviderApplication>(api.post(`/operator/provider-applications/${encodeURIComponent(id)}/request-changes`, payload));

export const approveProviderApplication = (id: string, payload: { note?: string; tier?: 'Standard' | 'Preferred' }) =>
  unwrap<ProviderApplication>(api.post(`/operator/provider-applications/${encodeURIComponent(id)}/approve`, payload));

export const rejectProviderApplication = (id: string, payload: { reasonCode: string; message: string }) =>
  unwrap<ProviderApplication>(api.post(`/operator/provider-applications/${encodeURIComponent(id)}/reject`, payload));

export const suspendProvider = (vendorId: string, reason: string) =>
  unwrap(api.post(`/operator/providers/${encodeURIComponent(vendorId)}/suspend`, { reason }));

export const reinstateProvider = (vendorId: string, reason: string) =>
  unwrap(api.post(`/operator/providers/${encodeURIComponent(vendorId)}/reinstate`, { reason }));

export function providerExportUrl(params: Record<string, string>): string {
  const search = new URLSearchParams(params).toString();
  return `/api/operator/provider-applications/export.csv${search ? `?${search}` : ''}`;
}
