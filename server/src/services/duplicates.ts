/**
 * Duplicate detection: warns when the same phone number or the same DISCOM
 * consumer number already sits in an active application. It never blocks a
 * submission — the operator decides.
 */
import type { Application, DuplicateWarning } from '../types';

/** Statuses that count as "still active" (a rejected or closed file is not). */
export const ACTIVE_STATUSES = [
  'Pending Verification',
  'Approved',
  'Loan Sanctioned',
  'Loan Disbursed',
  'Installation Scheduled',
  'Installed',
  'Net Meter Commissioned',
  'Subsidy Claimed',
  'Subsidy Credited',
] as const;

const normalisePhone = (phone: string | undefined): string => (phone ?? '').replace(/\D/g, '').slice(-10);
const normaliseConsumerNumber = (value: string | undefined): string => (value ?? '').replace(/\s+/g, '').toUpperCase();

export interface DuplicateCandidate {
  phone?: string;
  consumerNumber?: string;
  /** Ignore this application when checking (used when re-checking an existing file). */
  id?: string;
}

export function findDuplicates(candidate: DuplicateCandidate, existing: Application[]): DuplicateWarning[] {
  const phone = normalisePhone(candidate.phone);
  const consumerNumber = normaliseConsumerNumber(candidate.consumerNumber);
  const warnings: DuplicateWarning[] = [];

  existing.forEach((application) => {
    if (candidate.id && application.id === candidate.id) return;
    if (!ACTIVE_STATUSES.includes(application.status as (typeof ACTIVE_STATUSES)[number])) return;

    const matchesPhone = phone.length === 10 && normalisePhone(application.phone) === phone;
    const matchesConsumer = consumerNumber.length > 0 && normaliseConsumerNumber(application.consumerNumber) === consumerNumber;

    if (matchesPhone || matchesConsumer) {
      warnings.push({
        applicationId: application.id,
        applicantName: application.applicantName,
        status: application.status,
        matchedOn: matchesPhone ? 'phone' : 'consumer number',
        value: matchesPhone ? `+91 ${application.phone}` : application.consumerNumber ?? '',
        assignedTo: application.assignedTo?.name,
      });
    }
  });

  return warnings;
}
