import { Router } from 'express';
import * as analytics from '../controllers/analyticsController';
import * as applications from '../controllers/applicationController';
import * as audits from '../controllers/auditController';
import * as auth from '../controllers/authController';
import { resetDemo } from '../controllers/demoController';
import { getHealth } from '../controllers/healthController';
import * as schemes from '../controllers/schemeController';
import * as transactions from '../controllers/transactionController';
import * as users from '../controllers/userController';
import * as vendors from '../controllers/vendorController';
import * as provider from '../controllers/providerController';
import { optionalAuth, requireAuth, requireOperator, requireProvider, requireRole } from '../middleware/auth';
import { loginLimiter } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import {
  assignSchema,
  auditSchema,
  createApplicationSchema,
  duplicateQuerySchema,
  filterQuerySchema,
  leadQuerySchema,
  loginSchema,
  schemeQuerySchema,
  statusUpdateSchema,
  transactionQuerySchema,
  transactionSchema,
  vendorActiveSchema,
  vendorQuerySchema,
} from '../validators/schemas';
import {
  approveProviderSchema,
  assignReviewerSchema,
  checklistPatchSchema,
  documentTypeSchema,
  documentVerifySchema,
  idParamSchema,
  installerUpdateSchema,
  providerListQuerySchema,
  providerLoginSchema,
  providerRegisterSchema,
  providerStepParamSchema,
  rejectProviderSchema,
  requestChangesSchema,
  revealQuerySchema,
  suspendSchema,
} from '../validators/providerSchemas';

export const router = Router();

router.get('/health', getHealth);

// Authentication
router.post('/auth/login', loginLimiter, validate(loginSchema), asyncHandler(auth.postLogin));
router.get('/auth/me', requireAuth, asyncHandler(auth.getMe));
router.get('/users', ...requireOperator, asyncHandler(users.listUsers));

// Vendors (public read, operator write)
router.get('/vendors', optionalAuth, validate(vendorQuerySchema, 'query'), asyncHandler(vendors.listVendors));
router.get('/vendors/:id', asyncHandler(vendors.getVendor));
router.patch('/vendors/:id/active', ...requireOperator, validate(vendorActiveSchema), asyncHandler(vendors.setVendorActive));

// Subsidy scheme catalogue (config-driven, every entry labelled as a demo assumption)
router.get('/schemes', validate(schemeQuerySchema, 'query'), asyncHandler(schemes.listSubsidySchemes));

// Solar audits (public — consumer flow)
router.post('/audits', validate(auditSchema), asyncHandler(audits.createAudit));
router.get('/audits/:id', asyncHandler(audits.getAudit));

// Applications
router.post('/applications', validate(createApplicationSchema), asyncHandler(applications.createApplication));
router.get('/applications', ...requireOperator, validate(leadQuerySchema, 'query'), asyncHandler(applications.listApplications));
router.get('/applications/duplicates', validate(duplicateQuerySchema, 'query'), asyncHandler(applications.checkDuplicates));
router.get('/applications/export.csv', ...requireOperator, validate(leadQuerySchema, 'query'), asyncHandler(applications.exportLeads));
router.get('/applications/:id/track', asyncHandler(applications.trackApplication));
router.get('/applications/:id', ...requireOperator, asyncHandler(applications.getApplication));
router.patch('/applications/:id/status', ...requireOperator, validate(statusUpdateSchema), asyncHandler(applications.updateApplicationStatus));
router.patch('/applications/:id/assign', ...requireOperator, validate(assignSchema), asyncHandler(applications.assignApplication));

// Leads — the operator pipeline view of applications
router.get('/leads', ...requireOperator, validate(leadQuerySchema, 'query'), asyncHandler(applications.listApplications));
router.get('/leads/export.csv', ...requireOperator, validate(leadQuerySchema, 'query'), asyncHandler(applications.exportLeads));
router.patch('/leads/:id/status', ...requireOperator, validate(statusUpdateSchema), asyncHandler(applications.updateApplicationStatus));
router.patch('/leads/:id/assign', ...requireOperator, validate(assignSchema), asyncHandler(applications.assignApplication));

// Money flow — transactions (finance desk)
router.get('/transactions', ...requireOperator, validate(transactionQuerySchema, 'query'), asyncHandler(transactions.listTransactions));
router.get('/transactions/export.csv', ...requireOperator, validate(transactionQuerySchema, 'query'), asyncHandler(transactions.exportTransactions));
router.post('/transactions', requireAuth, requireRole('admin', 'finance'), validate(transactionSchema), asyncHandler(transactions.createTransaction));

// Analytics (every endpoint honours the global filter bar)
router.get('/analytics/overview', ...requireOperator, validate(filterQuerySchema, 'query'), asyncHandler(analytics.getOverview));
router.get('/analytics/monthly', ...requireOperator, validate(filterQuerySchema, 'query'), asyncHandler(analytics.getMonthly));
router.get('/analytics/regional', ...requireOperator, validate(filterQuerySchema, 'query'), asyncHandler(analytics.getRegional));
router.get('/analytics/funnel', ...requireOperator, validate(filterQuerySchema, 'query'), asyncHandler(analytics.getFunnel));
router.get('/analytics/money-flow', ...requireOperator, validate(filterQuerySchema, 'query'), asyncHandler(analytics.getTransactionSummary));

// Demo controls
router.post('/demo/reset', requireAuth, requireRole('admin'), asyncHandler(resetDemo));

// Provider auth + onboarding
router.post('/provider/auth/register', loginLimiter, validate(providerRegisterSchema), asyncHandler(provider.postRegister));
router.post('/provider/auth/login', loginLimiter, validate(providerLoginSchema), asyncHandler(provider.postLogin));
router.get('/provider/auth/me', ...requireProvider, asyncHandler(provider.getMe));
router.get('/provider/application', ...requireProvider, asyncHandler(provider.getApplication));
router.put('/provider/application/steps/:step', ...requireProvider, validate(providerStepParamSchema, 'params'), asyncHandler(provider.putStep));
router.post('/provider/application/submit', ...requireProvider, asyncHandler(provider.postSubmit));
router.post('/provider/application/resubmit', ...requireProvider, asyncHandler(provider.postResubmit));
router.post(
  '/provider/application/documents',
  ...requireProvider,
  provider.providerUpload.single('file'),
  validate(documentTypeSchema),
  asyncHandler(provider.postDocument),
);
router.delete('/provider/application/documents/:docId', ...requireProvider, asyncHandler(provider.deleteDocument));
router.get('/provider/documents/:docId', requireAuth, asyncHandler(provider.streamDocument));
router.get('/provider/leads', ...requireProvider, asyncHandler(provider.getLeads));
router.post('/provider/leads/:id/update', ...requireProvider, validate(installerUpdateSchema), asyncHandler(provider.postLeadUpdate));
router.get('/provider/payouts', ...requireProvider, asyncHandler(provider.getPayouts));
router.get('/provider/notifications', ...requireProvider, asyncHandler(provider.getNotifications));
router.get('/provider/ifsc/:ifsc', requireAuth, asyncHandler(provider.lookupIfscHandler));

// Operator review of provider applications
router.get('/operator/provider-applications/stats', ...requireOperator, asyncHandler(provider.operatorStats));
router.get('/operator/provider-applications/export.csv', ...requireOperator, validate(providerListQuerySchema, 'query'), asyncHandler(provider.operatorExport));
router.get('/operator/provider-applications', ...requireOperator, validate(providerListQuerySchema, 'query'), asyncHandler(provider.operatorList));
router.get(
  '/operator/provider-applications/:id',
  ...requireOperator,
  validate(idParamSchema, 'params'),
  validate(revealQuerySchema, 'query'),
  asyncHandler(provider.operatorGet),
);
router.patch(
  '/operator/provider-applications/:id/assign',
  ...requireOperator,
  validate(assignReviewerSchema),
  asyncHandler(provider.operatorAssign),
);
router.patch(
  '/operator/provider-applications/:id/checklist',
  ...requireOperator,
  validate(checklistPatchSchema),
  asyncHandler(provider.operatorChecklist),
);
router.patch(
  '/operator/provider-applications/:id/documents/:docId',
  ...requireOperator,
  validate(documentVerifySchema),
  asyncHandler(provider.operatorDocument),
);
router.post(
  '/operator/provider-applications/:id/request-changes',
  ...requireOperator,
  validate(requestChangesSchema),
  asyncHandler(provider.operatorRequestChanges),
);
router.post(
  '/operator/provider-applications/:id/approve',
  requireAuth,
  requireRole('admin'),
  validate(approveProviderSchema),
  asyncHandler(provider.operatorApprove),
);
router.post(
  '/operator/provider-applications/:id/reject',
  requireAuth,
  requireRole('admin', 'agent'),
  validate(rejectProviderSchema),
  asyncHandler(provider.operatorReject),
);
router.post(
  '/operator/provider-applications/:id/site-verification',
  ...requireOperator,
  asyncHandler(provider.operatorSiteVerification),
);
router.post('/operator/providers/:vendorId/suspend', requireAuth, requireRole('admin'), validate(suspendSchema), asyncHandler(provider.operatorSuspend));
router.post('/operator/providers/:vendorId/reinstate', requireAuth, requireRole('admin'), validate(suspendSchema), asyncHandler(provider.operatorReinstate));
