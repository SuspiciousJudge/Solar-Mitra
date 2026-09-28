import type { Request, Response } from 'express';
import {
  SCHEME_CATALOGUE_VERSION,
  SCHEME_DISCLAIMER,
  SCHEME_LAST_VERIFIED,
  SCHEME_SUPPORT_TYPES,
  SUBSIDY_SCHEMES,
  describeSchemeCalc,
  listSchemes,
} from '../config/subsidySchemes';
import { getValidatedQuery } from '../middleware/validate';
import { sendSuccess } from '../utils/apiResponse';

/** Public: the scheme catalogue behind the operator Scheme filter. */
export async function listSubsidySchemes(req: Request, res: Response) {
  const query = getValidatedQuery<{ level?: 'central' | 'state'; state?: string; category?: string }>(req) ?? {};
  const schemes = listSchemes({ level: query.level, state: query.state, category: query.category as never }).map((scheme) => ({
    ...scheme,
    calcDescription: describeSchemeCalc(scheme.calc),
    specialCategoryCalcDescription: scheme.specialCategoryOverride ? describeSchemeCalc(scheme.specialCategoryOverride) : undefined,
    disclaimer: SCHEME_DISCLAIMER,
  }));
  sendSuccess(res, {
    version: SCHEME_CATALOGUE_VERSION,
    lastVerified: SCHEME_LAST_VERIFIED,
    disclaimer: SCHEME_DISCLAIMER,
    supportTypes: SCHEME_SUPPORT_TYPES,
    total: SUBSIDY_SCHEMES.length,
    schemes,
  });
}
