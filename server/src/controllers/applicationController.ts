import type { Request, Response } from 'express';
import type { z } from 'zod';
import { defaultSchemesForState } from '../config/subsidySchemes';
import { getValidatedQuery } from '../middleware/validate';
import { getStore } from '../services/dataStore';

import { findDuplicates } from '../services/duplicates';
import {
  matchesAttributes,
  toRecordFilters,
  type RawFilterQuery,
} from '../services/filters';
import {
  buildDuplicateMap,
  queryLeads,
  toApplicationView,
  type LeadQuery,
} from '../services/leadQuery';
import {
  calculateLoanSummary,
  calculateMonthlySavings,
  calculateSolarRecommendation,
  calculateMarketCost,
  calculateSubsidy,
  calculateNetCost,
} from '../services/solarCalculator';
import { DEMO_POLICY } from '../config/policyConfig';
import { assertCanAssign, planStatusChange } from '../services/statusMachine';
import { csvFilename, sendCsv, toCsv } from '../services/csv';

import { AppError, notFound } from '../utils/AppError';
import { sendSuccess } from '../utils/apiResponse';
import { findRegion } from '../data/indiaRegions';
import type { Application } from '../types';
import type {
  createApplicationSchema,
  statusUpdateSchema,
  assignSchema,
} from '../validators/schemas';

export async function createApplication(req: Request, res: Response) {
  const input = req.body as z.infer<typeof createApplicationSchema>;
  const store = getStore();

  const vendor = await store.getVendor(input.vendorId);
  if (!vendor) throw new AppError(400, 'The selected vendor could not be found');
  if (!vendor.active) throw new AppError(400, 'The selected vendor is not accepting new installations');

  // Figures are recomputed server-side so the stored application never trusts client maths.
  const recommendation = calculateSolarRecommendation(input.monthlyUnits, input.state, input.monthlyBill);
  const selectedKW = input.selectedKW ?? recommendation.recommendedKW;
  if (selectedKW < 1 || selectedKW > DEMO_POLICY.maxRecommendedKW) throw new AppError(400, 'Selected system size is not supported');
  const marketCost = calculateMarketCost(selectedKW);
  const subsidy = calculateSubsidy(selectedKW, input.state, marketCost);
  const rec = { ...recommendation, recommendedKW: selectedKW, marketCost, ...subsidy, netCost: calculateNetCost(marketCost, subsidy.totalSubsidy) };
  if (input.loanAmount > rec.netCost) throw new AppError(400, 'Loan amount cannot exceed the estimated net cost');
  const hasLoan = input.loanAmount > 0;
  const loan = calculateLoanSummary(input.loanAmount, input.interestRate, input.tenureMonths);

  const existing = await store.listApplications();
  const duplicates = findDuplicates({ phone: input.phone, consumerNumber: input.consumerNumber }, existing);
  const region = findRegion(input.state);

  const application = await store.createApplication({
    applicantName: input.applicantName,
    phone: input.phone,
    consumerNumber: input.consumerNumber,
    location: input.location,
    state: input.state,
    district: input.district ?? vendor.district ?? region?.districts[0],
    discom: input.discom,
    auditId: input.auditId,
    monthlyUnits: input.monthlyUnits,
    monthlyBill: input.monthlyBill ?? 0,
    systemKW: rec.recommendedKW,
    marketCost: rec.marketCost,
    centralSubsidy: rec.centralSubsidy,
    stateSubsidy: rec.stateSubsidy,
    subsidy: rec.totalSubsidy,
    netCost: rec.netCost,
    loanAmount: input.loanAmount,
    interestRate: hasLoan ? input.interestRate : 0,
    tenureMonths: hasLoan ? input.tenureMonths : 0,
    emi: loan.emi,
    schemeIds: defaultSchemeIdsForState(input.state),
    vendorId: vendor.id,
      selectedKW,
      preferredDate: input.preferredDate,
      preferredTime: input.preferredTime,
      installerNote: input.note,
      consentGiven: input.consentGiven,
      journey: input.journey,

      estimatedMonthlyGeneration: rec.estimatedMonthlyGeneration,
      estimatedMonthlySavings: calculateMonthlySavings(
        input.monthlyUnits,
        input.monthlyBill,
        rec.estimatedMonthlyGeneration
      ),
    };

  // Duplicates never block a submission — the operator sees the warning and decides.
  sendSuccess(res, { ...application, duplicates: duplicates.length > 0 ? duplicates : undefined }, 201);
}

/** Agents only see unassigned leads and the ones assigned to them. */
function scopeForRole(req: Request, applications: Application[]): Application[] {
  if (req.auth?.role !== 'agent') return applications;
  return applications.filter((application) => !application.assignedTo || application.assignedTo.userId === req.auth?.sub);
}

function toLeadQuery(req: Request): LeadQuery {
  const raw = getValidatedQuery<RawFilterQuery & Pick<LeadQuery, 'sortBy' | 'order' | 'page' | 'limit'>>(req);
  return { ...toRecordFilters(raw), sortBy: raw.sortBy, order: raw.order, page: raw.page, limit: raw.limit };
}

export async function listApplications(req: Request, res: Response) {
  const query = toLeadQuery(req);
  const applications = scopeForRole(req, await getStore().listApplications());
  const page = queryLeads(applications, query);
  const duplicateIndex = buildDuplicateMap(applications);
  sendSuccess(res, {
    ...page,
    items: page.items.map((application) => {
      const others = duplicateIndex.get(application.id) ?? [];
      return toApplicationView(
        application,
        others.map((candidate) => applications.find((entry) => entry.id === candidate.id)).filter((entry): entry is Application => Boolean(entry)),
      );
    }),
  });
}

export async function getApplication(req: Request, res: Response) {
  const store = getStore();
  const application = await store.getApplication(req.params.id);
  if (!application) throw notFound('Application');
  const [vendor, applications] = await Promise.all([store.getVendor(application.vendorId), store.listApplications()]);
  const view = toApplicationView(application, applications);
  sendSuccess(res, { ...view, vendor: vendor ?? null });
}

/** Public, privacy-safe tracking view for households (no phone or financial details). */
export async function trackApplication(req: Request, res: Response) {
  const application = await getStore().getApplication(req.params.id);
  if (!application) throw notFound('Application');
  sendSuccess(res, {
    id: application.id,
    applicantFirstName: application.applicantName.split(' ')[0],
    systemKW: application.systemKW,
    vendorName: application.vendorName,
    status: application.status,
    timeline: application.timeline,
    createdAt: application.createdAt,
    updatedAt: application.updatedAt,
  });
}

export async function updateApplicationStatus(req: Request, res: Response) {
  const { status, note, reason } = req.body as z.infer<typeof statusUpdateSchema>;
  const store = getStore();
  const application = await store.getApplication(req.params.id);
  if (!application) throw notFound('Application');
  if (!req.auth) throw new AppError(401, 'Please sign in to continue');

  // The state machine is enforced here: illegal moves return 409, role problems 403.
  const event = planStatusChange({
    application,
    next: status,
    actor: { userId: req.auth.sub, name: req.auth.name ?? req.auth.email, role: req.auth.role },
    note,
    reason,
  });

  const updated = await store.updateApplicationStatus({ id: application.id, status, event });
  if (!updated) throw notFound('Application');
  sendSuccess(res, updated);
}

export async function assignApplication(req: Request, res: Response) {
  const { userId, assignToMe } = req.body as z.infer<typeof assignSchema>;
  const store = getStore();
  const application = await store.getApplication(req.params.id);
  if (!application) throw notFound('Application');
  if (!req.auth) throw new AppError(401, 'Please sign in to continue');

  const actor = { userId: req.auth.sub, name: req.auth.name ?? req.auth.email, role: req.auth.role };
  const targetId = assignToMe ? actor.userId : (userId ?? null);
  assertCanAssign(targetId, actor);

  let assignment = null as null | { userId: string; name: string; at: string; byUserId: string; byName: string };
  if (targetId) {
    const target = await store.findUserById(targetId);
    if (!target) throw new AppError(400, 'That operator could not be found');
    assignment = { userId: target.id, name: target.name, at: new Date().toISOString(), byUserId: actor.userId, byName: actor.name };
  }

  const updated = await store.assignApplication(application.id, assignment);
  if (!updated) throw notFound('Application');
  sendSuccess(res, updated);
}

export async function checkDuplicates(req: Request, res: Response) {
  const { phone, consumerNumber } = req.query as { phone?: string; consumerNumber?: string };
  if (!phone && !consumerNumber) throw new AppError(400, 'Provide a phone number or a consumer number to check');
  const applications = await getStore().listApplications();
  sendSuccess(res, { duplicates: findDuplicates({ phone, consumerNumber }, applications) });
}

const LEAD_CSV_COLUMNS = [
  { key: 'id', label: 'Application ID', value: (row: Application) => row.id },
  { key: 'applicantName', label: 'Applicant', value: (row: Application) => row.applicantName },
  { key: 'phone', label: 'Phone', value: (row: Application) => `+91 ${row.phone}` },
  { key: 'consumerNumber', label: 'Consumer number', value: (row: Application) => row.consumerNumber ?? '' },
  { key: 'state', label: 'State/UT', value: (row: Application) => row.state },
  { key: 'district', label: 'District', value: (row: Application) => row.district ?? '' },
  { key: 'discom', label: 'DISCOM', value: (row: Application) => row.discom ?? '' },
  { key: 'status', label: 'Status', value: (row: Application) => row.status },
  { key: 'paymentMode', label: 'Payment mode', value: (row: Application) => (row.paymentMode === 'loan' ? 'Loan' : 'Upfront') },
  { key: 'assignedTo', label: 'Assigned to', value: (row: Application) => row.assignedTo?.name ?? 'Unassigned' },
  { key: 'systemKW', label: 'System (kW)', value: (row: Application) => row.systemKW },
  { key: 'marketCost', label: 'System cost (INR)', value: (row: Application) => row.marketCost },
  { key: 'subsidy', label: 'Subsidy (INR)', value: (row: Application) => row.subsidy },
  { key: 'loanAmount', label: 'Loan amount (INR)', value: (row: Application) => row.loanAmount },
  { key: 'emi', label: 'EMI (INR)', value: (row: Application) => row.emi },
  { key: 'waitingFor', label: 'Waiting for', value: (row: Application) => toApplicationView(row, []).ageing.waitingLabel },
  { key: 'sla', label: 'SLA', value: (row: Application) => (toApplicationView(row, []).ageing.slaBreached ? 'Breached' : 'Within SLA') },
  { key: 'schemes', label: 'Schemes', value: (row: Application) => row.schemeIds.join(' | ') },
  { key: 'createdAt', label: 'Submitted', value: (row: Application) => row.createdAt.slice(0, 10) },
];

/** CSV export of exactly what the active filters show — no pagination. */
export async function exportLeads(req: Request, res: Response) {
  const query = toLeadQuery(req);
  const applications = scopeForRole(req, await getStore().listApplications());
  const matched = applications
    .filter((application) => matchesAttributes(application, query))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  sendCsv(res, csvFilename('solarmitra-leads'), toCsv(matched, LEAD_CSV_COLUMNS));
}
