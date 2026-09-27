import type { Request, Response } from 'express';
import { isServingDemoData } from '../config/database';
import { getStore } from '../services/dataStore';
import { sendSuccess } from '../utils/apiResponse';

export async function resetDemo(_req: Request, res: Response) {
  await getStore().reset();
  sendSuccess(res, { reset: true, demoMode: isServingDemoData(), at: new Date().toISOString() });
}
