import type { AuditResult, BillData } from '@/types';
import { api, isDemoFallbackEnabled, isNetworkError, unwrap } from './api';

/**
 * Records the audit on the server. The UI already shows figures from the shared
 * calculator, so an offline demo simply continues without an audit id.
 */
export async function createAudit(bill: BillData): Promise<{ auditId?: string; offline: boolean }> {
  try {
    const result = await unwrap<AuditResult>(
      api.post('/audits', { state: bill.state, monthlyUnits: bill.monthlyUnits, monthlyBill: bill.monthlyBill || undefined }),
    );
    return { auditId: result.audit.id, offline: false };
  } catch (error) {
    if (isNetworkError(error) && isDemoFallbackEnabled()) return { offline: true };
    throw error;
  }
}
