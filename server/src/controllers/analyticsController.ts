import type { Request, Response } from 'express';
import { getValidatedQuery } from '../middleware/validate';
import { getStore } from '../services/dataStore';
import { EMPTY_FILTERS, toRecordFilters, type RawFilterQuery, type RecordFilters } from '../services/filters';
import { buildFunnel, buildMonthly, buildOverview, buildRegional, buildTransactionSummary } from '../services/analyticsService';
import { sendSuccess } from '../utils/apiResponse';

/** Agents only ever see the book of business assigned to them. */
export function applyScope(req: Request, filters: RecordFilters): RecordFilters {
  if (req.auth?.role === 'agent') return { ...filters, assignedTo: req.auth.sub };
  return filters;
}

export async function loadAnalytics(req: Request) {
  const store = getStore();
  const [applications, audits, transactions] = await Promise.all([store.listApplications(), store.listAudits(), store.listTransactions()]);
  const filters = applyScope(req, getValidatedQuery<RawFilterQuery>(req) ? toRecordFilters(getValidatedQuery<RawFilterQuery>(req)) : EMPTY_FILTERS);
  return { applications, audits, transactions, filters };
}

export async function getOverview(req: Request, res: Response) {
  sendSuccess(res, buildOverview(await loadAnalytics(req)));
}

export async function getMonthly(req: Request, res: Response) {
  sendSuccess(res, buildMonthly(await loadAnalytics(req)));
}

export async function getRegional(req: Request, res: Response) {
  sendSuccess(res, buildRegional(await loadAnalytics(req)));
}

export async function getFunnel(req: Request, res: Response) {
  sendSuccess(res, buildFunnel(await loadAnalytics(req)));
}

export async function getTransactionSummary(req: Request, res: Response) {
  sendSuccess(res, buildTransactionSummary(await loadAnalytics(req)));
}
