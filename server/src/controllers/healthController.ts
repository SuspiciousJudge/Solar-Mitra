import type { Request, Response } from 'express';
import { getDatabaseState, isServingDemoData } from '../config/database';
import { sendSuccess } from '../utils/apiResponse';

export function getHealth(_req: Request, res: Response) {
  sendSuccess(res, {
    status: 'ok',
    service: 'solarmitra-api',
    demoMode: isServingDemoData(),
    database: getDatabaseState(),
    timestamp: new Date().toISOString(),
  });
}
