import type { Request, Response } from 'express';
import { getValidatedQuery } from '../middleware/validate';
import { getStore } from '../services/dataStore';
import type { VendorFilter } from '../types';
import { notFound } from '../utils/AppError';
import { sendSuccess } from '../utils/apiResponse';

export async function listVendors(req: Request, res: Response) {
  const filter = getValidatedQuery<VendorFilter>(req) ?? {};
  sendSuccess(res, await getStore().listVendors(filter));
}

export async function getVendor(req: Request, res: Response) {
  const vendor = await getStore().getVendor(req.params.id);
  if (!vendor) throw notFound('Vendor');
  sendSuccess(res, vendor);
}

export async function setVendorActive(req: Request, res: Response) {
  const vendor = await getStore().setVendorActive(req.params.id, req.body.active);
  if (!vendor) throw notFound('Vendor');
  sendSuccess(res, vendor);
}
