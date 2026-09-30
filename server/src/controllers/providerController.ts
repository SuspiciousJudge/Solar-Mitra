import type { Request, Response } from 'express';
import multer from 'multer';
import { getValidatedQuery } from '../middleware/validate';
import { getStore } from '../services/dataStore';
import { assertUpload, readDocumentFile } from '../services/documentStore';
import * as provider from '../services/providerService';
import { toPublicUser } from '../services/authService';
import { AppError } from '../utils/AppError';
import { sendSuccess } from '../utils/apiResponse';
import { MAX_DOCUMENT_BYTES } from '../validators/providerRules';
import type { ProviderListQuery } from '../services/providerService';
import { providerStepSchemas } from '../validators/providerSchemas';
import type { DocumentType, ProviderStep } from '../validators/providerRules';

export const providerUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_DOCUMENT_BYTES, files: 1 },
});

function actor(req: Request) {
  if (!req.auth) throw new AppError(401, 'Please sign in to continue');
  return req.auth;
}

export async function postRegister(req: Request, res: Response) {
  sendSuccess(res, await provider.registerProvider(req.body), 201);
}

export async function postLogin(req: Request, res: Response) {
  sendSuccess(res, await provider.loginProvider(req.body.email, req.body.password));
}

export async function getMe(req: Request, res: Response) {
  const user = await getStore().findUserById(actor(req).sub);
  if (!user) throw new AppError(401, 'Your session is no longer valid. Please sign in again.');
  sendSuccess(res, toPublicUser(user));
}

export async function getApplication(req: Request, res: Response) {
  sendSuccess(res, await provider.ownApplication(actor(req).sub));
}

export async function putStep(req: Request, res: Response) {
  const step = req.params.step as ProviderStep;
  const parsed = providerStepSchemas[step].parse(req.body) as Record<string, unknown>;
  sendSuccess(res, await provider.saveStep(actor(req).sub, step, parsed));
}

export async function postSubmit(req: Request, res: Response) {
  sendSuccess(res, await provider.submitApplication(actor(req).sub, req.ip));
}

export async function postResubmit(req: Request, res: Response) {
  sendSuccess(res, await provider.submitApplication(actor(req).sub, req.ip));
}

export async function postDocument(req: Request, res: Response) {
  const file = req.file;
  if (!file) throw new AppError(400, 'Please attach a PDF, JPG or PNG file');
  assertUpload(file);
  sendSuccess(res, await provider.addDocument(actor(req).sub, req.body.type as DocumentType, file), 201);
}

export async function deleteDocument(req: Request, res: Response) {
  sendSuccess(res, await provider.removeDocument(actor(req).sub, req.params.docId));
}

export async function streamDocument(req: Request, res: Response) {
  const { document } = await provider.findDocumentForReader(req.params.docId, actor(req));
  const buffer = readDocumentFile(document.storedName);
  if (!buffer) throw new AppError(404, 'Document file is no longer available');
  res.setHeader('Content-Type', document.mimeType);
  res.setHeader('Content-Disposition', `inline; filename="${document.fileName.replace(/"/g, '')}"`);
  res.setHeader('Cache-Control', 'private, no-store');
  res.send(buffer);
}

export async function getLeads(req: Request, res: Response) {
  sendSuccess(res, await provider.providerLeads(actor(req).sub));
}

export async function postLeadUpdate(req: Request, res: Response) {
  sendSuccess(res, await provider.addLeadUpdate(actor(req).sub, req.params.id, req.body));
}

export async function getPayouts(req: Request, res: Response) {
  sendSuccess(res, await provider.providerPayouts(actor(req).sub));
}

export async function getNotifications(req: Request, res: Response) {
  sendSuccess(res, await provider.providerNotifications(actor(req).sub));
}

export async function operatorList(req: Request, res: Response) {
  sendSuccess(res, await provider.listForOperator(getValidatedQuery<ProviderListQuery>(req)));
}

export async function operatorExport(req: Request, res: Response) {
  const query = getValidatedQuery<ProviderListQuery>(req);
  const all = await getStore().listProviderApplications();
  const matched = provider.filterProviderApplications(all, { ...query, page: 1, limit: 10_000 });
  provider.writeProviderCsv(res, matched);
}

export async function operatorStats(_req: Request, res: Response) {
  sendSuccess(res, await provider.computeStats());
}

export async function operatorGet(req: Request, res: Response) {
  const reveal = getValidatedQuery<{ reveal?: 'bank' }>(req)?.reveal === 'bank';
  sendSuccess(res, await provider.operatorGet(req.params.id, { revealBank: reveal, actor: actor(req) }));
}

export async function operatorAssign(req: Request, res: Response) {
  sendSuccess(res, await provider.assignReviewer(req.params.id, actor(req), req.body.reviewerId, req.body.assignToMe));
}

export async function operatorChecklist(req: Request, res: Response) {
  sendSuccess(res, await provider.patchChecklist(req.params.id, actor(req), req.body.itemKey, req.body.status, req.body.note));
}

export async function operatorDocument(req: Request, res: Response) {
  sendSuccess(res, await provider.verifyDocument(req.params.id, req.params.docId, actor(req), req.body.verification, req.body.remark));
}

export async function operatorRequestChanges(req: Request, res: Response) {
  sendSuccess(res, await provider.requestChanges(req.params.id, actor(req), req.body));
}

export async function operatorApprove(req: Request, res: Response) {
  sendSuccess(res, await provider.approveApplication(req.params.id, actor(req), req.body.note, req.body.tier));
}

export async function operatorReject(req: Request, res: Response) {
  sendSuccess(res, await provider.rejectApplication(req.params.id, actor(req), req.body.reasonCode, req.body.message));
}

export async function operatorSiteVerification(req: Request, res: Response) {
  sendSuccess(res, await provider.moveToSiteVerification(req.params.id, actor(req), req.body.note));
}

export async function operatorSuspend(req: Request, res: Response) {
  sendSuccess(res, await provider.suspendVendor(req.params.vendorId, actor(req), req.body.reason));
}

export async function operatorReinstate(req: Request, res: Response) {
  sendSuccess(res, await provider.reinstateVendor(req.params.vendorId, actor(req), req.body.reason));
}

export async function lookupIfscHandler(req: Request, res: Response) {
  const { lookupIfsc } = await import('../validators/providerRules');
  const ifsc = String(req.params.ifsc ?? '').toUpperCase();
  const found = lookupIfsc(ifsc);
  sendSuccess(res, found ? { ...found, ifsc, known: true } : { ifsc, known: false, bank: 'Will be verified manually', branch: '', city: '' });
}
