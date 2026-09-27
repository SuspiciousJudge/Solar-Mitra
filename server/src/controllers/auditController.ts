import type { Request, Response } from 'express';
import type { z } from 'zod';
import { getStore } from '../services/dataStore';
import { calculateCO2Impact, calculateSolarRecommendation } from '../services/solarCalculator';
import { notFound } from '../utils/AppError';
import { sendSuccess } from '../utils/apiResponse';
import type { auditSchema } from '../validators/schemas';

export async function createAudit(req: Request, res: Response) {
  const input = req.body as z.infer<typeof auditSchema>;
  const rec = calculateSolarRecommendation(input.monthlyUnits, input.state, input.monthlyBill);
  const audit = await getStore().createAudit({
    userId: input.userId,
    state: input.state,
    monthlyUnits: input.monthlyUnits,
    monthlyBill: input.monthlyBill ?? 0,
    recommendedKW: rec.recommendedKW,
    marketCost: rec.marketCost,
    subsidy: rec.totalSubsidy,
    centralSubsidy: rec.centralSubsidy,
    stateSupport: rec.stateSubsidy,
    netCost: rec.netCost,
    estimatedMonthlyGeneration: rec.estimatedMonthlyGeneration,
    estimatedMonthlySavings: rec.estimatedMonthlySavings,
  });
  sendSuccess(
    res,
    { audit, recommendation: rec, climateImpact: calculateCO2Impact(rec.recommendedKW, rec.estimatedMonthlyGeneration) },
    201,
  );
}

export async function getAudit(req: Request, res: Response) {
  const audit = await getStore().getAudit(req.params.id);
  if (!audit) throw notFound('Audit');
  sendSuccess(res, audit);
}
