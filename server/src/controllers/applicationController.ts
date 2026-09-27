import type { Request, Response } from 'express';
import type { z } from 'zod';
import { getValidatedQuery } from '../middleware/validate';
import { getStore } from '../services/dataStore';
import { queryLeads, type LeadQuery } from '../services/leadQuery';
import { calculateLoanSummary, calculateSolarRecommendation } from '../services/solarCalculator';
import { AppError, notFound } from '../utils/AppError';
import { sendSuccess } from '../utils/apiResponse';
import type { createApplicationSchema, statusUpdateSchema } from '../validators/schemas';

export async function createApplication(req: Request, res: Response) {
  const input = req.body as z.infer<typeof createApplicationSchema>;
  const store = getStore();

  const vendor = await store.getVendor(input.vendorId);
  if (!vendor) throw new AppError(400, 'The selected vendor could not be found');
  if (!vendor.active) throw new AppError(400, 'The selected vendor is not accepting new installations');

  // Figures are recomputed server-side so the stored application never trusts client maths.
  const rec = calculateSolarRecommendation(input.monthlyUnits, input.state, input.monthlyBill);
  if (input.loanAmount > rec.netCost) throw new AppError(400, 'Loan amount cannot exceed the estimated net cost');
  const hasLoan = input.loanAmount > 0;
  if (hasLoan && input.tenureMonths < 6) throw new AppError(400, 'Loan tenure must be at least 6 months');
  const loan = calculateLoanSummary(input.loanAmount, input.interestRate, input.tenureMonths);

  const application = await store.createApplication({
    applicantName: input.applicantName,
    phone: input.phone,
    location: input.location,
    state: input.state,
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
    vendorId: vendor.id,
  });
  sendSuccess(res, application, 201);
}

export async function listApplications(req: Request, res: Response) {
  const query = getValidatedQuery<LeadQuery>(req);
  sendSuccess(res, queryLeads(await getStore().listApplications(), query));
}

export async function getApplication(req: Request, res: Response) {
  const application = await getStore().getApplication(req.params.id);
  if (!application) throw notFound('Application');
  const vendor = await getStore().getVendor(application.vendorId);
  sendSuccess(res, { ...application, vendor });
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
  const { status, note } = req.body as z.infer<typeof statusUpdateSchema>;
  const application = await getStore().updateApplicationStatus(req.params.id, status, note);
  if (!application) throw notFound('Application');
  sendSuccess(res, application);
}
