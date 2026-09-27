import { Router } from 'express';
import * as analytics from '../controllers/analyticsController';
import * as applications from '../controllers/applicationController';
import * as audits from '../controllers/auditController';
import * as auth from '../controllers/authController';
import { resetDemo } from '../controllers/demoController';
import { getHealth } from '../controllers/healthController';
import * as vendors from '../controllers/vendorController';
import { requireAuth, requireOperator, requireRole } from '../middleware/auth';
import { loginLimiter } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import {
  auditSchema,
  createApplicationSchema,
  leadQuerySchema,
  loginSchema,
  statusUpdateSchema,
  vendorActiveSchema,
  vendorQuerySchema,
} from '../validators/schemas';

export const router = Router();

router.get('/health', getHealth);

// Authentication
router.post('/auth/login', loginLimiter, validate(loginSchema), asyncHandler(auth.postLogin));
router.get('/auth/me', requireAuth, asyncHandler(auth.getMe));

// Vendors (public read, operator write)
router.get('/vendors', validate(vendorQuerySchema, 'query'), asyncHandler(vendors.listVendors));
router.get('/vendors/:id', asyncHandler(vendors.getVendor));
router.patch('/vendors/:id/active', ...requireOperator, validate(vendorActiveSchema), asyncHandler(vendors.setVendorActive));

// Solar audits (public — consumer flow)
router.post('/audits', validate(auditSchema), asyncHandler(audits.createAudit));
router.get('/audits/:id', asyncHandler(audits.getAudit));

// Applications
router.post('/applications', validate(createApplicationSchema), asyncHandler(applications.createApplication));
router.get('/applications', ...requireOperator, validate(leadQuerySchema, 'query'), asyncHandler(applications.listApplications));
router.get('/applications/:id/track', asyncHandler(applications.trackApplication));
router.get('/applications/:id', ...requireOperator, asyncHandler(applications.getApplication));
router.patch('/applications/:id/status', ...requireOperator, validate(statusUpdateSchema), asyncHandler(applications.updateApplicationStatus));

// Leads — the operator pipeline view of applications
router.get('/leads', ...requireOperator, validate(leadQuerySchema, 'query'), asyncHandler(applications.listApplications));
router.patch('/leads/:id/status', ...requireOperator, validate(statusUpdateSchema), asyncHandler(applications.updateApplicationStatus));

// Analytics
router.get('/analytics/overview', ...requireOperator, asyncHandler(analytics.getOverview));
router.get('/analytics/monthly', ...requireOperator, asyncHandler(analytics.getMonthly));
router.get('/analytics/regional', ...requireOperator, asyncHandler(analytics.getRegional));

// Demo controls
router.post('/demo/reset', requireAuth, requireRole('admin'), asyncHandler(resetDemo));
