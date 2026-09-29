import { computeAgeing, lastEventAt } from '../utils/ageing';
import { findDuplicates, type DuplicateCandidate } from './duplicates';
import { matchesAttributes, type RecordFilters } from './filters';
import type { Application, ApplicationView } from '../types';

export interface LeadQuery extends RecordFilters {
  sortBy: 'createdAt' | 'applicantName' | 'systemKW' | 'subsidy' | 'loanAmount' | 'status' | 'updatedAt';
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
  const matched = applications.filter((application) => matchesAttributes(application, query));
  const direction = query.order === 'asc' ? 1 : -1;
  const sorted = [...matched].sort((a, b) => {
    if (query.sortBy === 'assignedTo' as string) {
      return String(a.assignedTo?.name ?? '').localeCompare(String(b.assignedTo?.name ?? '')) * direction;
    }
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

/** Phone/consumer-number index so duplicate badges can be computed in one pass. */
export function buildDuplicateMap(applications: Application[]): Map<string, DuplicateCandidate & { id: string }[]> {
  const byPhone = new Map<string, Application[]>();
  const byConsumer = new Map<string, Application[]>();
  applications.forEach((application) => {
    const phone = application.phone.replace(/\D/g, '').slice(-10);
    if (phone.length === 10) byPhone.set(phone, [...(byPhone.get(phone) ?? []), application]);
    const consumer = (application.consumerNumber ?? '').replace(/\s+/g, '').toUpperCase();
    if (consumer) byConsumer.set(consumer, [...(byConsumer.get(consumer) ?? []), application]);
  });
  const index = new Map<string, Application[]>();
  [...byPhone.values(), ...byConsumer.values()].forEach((group) => {
    if (group.length < 2) return;
    group.forEach((application) => {
      const others = index.get(application.id) ?? [];
      group.forEach((candidate) => {
        if (candidate.id !== application.id && !others.some((entry) => entry.id === candidate.id)) others.push(candidate);
      });
      index.set(application.id, others);
    });
  });

  const result = new Map<string, DuplicateCandidate & { id: string }[]>();
  index.forEach((others, id) => {
    result.set(
      id,
      others.map((application) => ({ id: application.id, phone: application.phone, consumerNumber: application.consumerNumber })),
    );
  });
  return result;
}

export function toApplicationView(application: Application, duplicates: Application[], now?: Date): ApplicationView {
  return {
    ...application,
    ageing: computeAgeing(
      {
        status: application.status,
        createdAt: application.createdAt,
        updatedAt: application.updatedAt,
        lastEventAt: lastEventAt(application.timeline),
      },
      now,
    ),
    duplicates: duplicates.length > 0 ? findDuplicates({ phone: application.phone, consumerNumber: application.consumerNumber, id: application.id }, duplicates) : undefined,
  };
}
