import type { Request, Response } from 'express';
import { buildMonthly, buildOverview, buildRegional } from '../services/analyticsService';
import { getStore } from '../services/dataStore';
import { sendSuccess } from '../utils/apiResponse';

export async function getOverview(_req: Request, res: Response) {
  sendSuccess(res, buildOverview(await getStore().listApplications()));
}

export async function getMonthly(_req: Request, res: Response) {
  sendSuccess(res, buildMonthly(await getStore().listApplications()));
}

export async function getRegional(_req: Request, res: Response) {
  sendSuccess(res, buildRegional(await getStore().listApplications()));
}
