import type { Application, ApplicationStatus } from '../types';

export interface LeadQuery {
  search?: string;
  state?: string;
  status?: ApplicationStatus;
  sortBy: 'createdAt' | 'applicantName' | 'systemKW' | 'subsidy' | 'loanAmount' | 'status';
  order: 'asc' | 'desc';
  page: number;
  limit: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
  limit: number;
}

/** Pure filtering/sorting/pagination so both data stores behave identically. */
export function queryLeads(applications: Application[], query: LeadQuery): Paginated<Application> {
  const search = query.search?.trim().toLowerCase();
  const filtered = applications.filter((app) => {
    if (query.state && app.state !== query.state) return false;
    if (query.status && app.status !== query.status) return false;
    if (search && !`${app.id} ${app.applicantName} ${app.location} ${app.phone}`.toLowerCase().includes(search)) return false;
    return true;
  });

  const direction = query.order === 'asc' ? 1 : -1;
  const sorted = [...filtered].sort((a, b) => {
    const left = a[query.sortBy];
    const right = b[query.sortBy];
    if (typeof left === 'number' && typeof right === 'number') return (left - right) * direction;
    return String(left).localeCompare(String(right)) * direction;
  });

  const pages = Math.max(1, Math.ceil(sorted.length / query.limit));
  const page = Math.min(Math.max(1, query.page), pages);
  const start = (page - 1) * query.limit;
  return { items: sorted.slice(start, start + query.limit), total: sorted.length, page, pages, limit: query.limit };
}
