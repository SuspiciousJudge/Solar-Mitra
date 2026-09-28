import { z } from 'zod';
import { APPLICATION_STATUSES } from '../types';

const phone = z
  .string({ required_error: 'Phone number is required' })
  .trim()
  .transform((v) => v.replace(/[\s-]/g, '').replace(/^(\+91|91)(?=\d{10}$)/, ''))
  .refine((v) => /^[6-9]\d{9}$/.test(v), 'Enter a valid 10-digit Indian mobile number');

const positiveNumber = (label: string, max: number) =>
  z.coerce
    .number({ invalid_type_error: `${label} must be a number` })
    .finite(`${label} must be a number`)
    .min(0, `${label} cannot be negative`)
    .max(max, `${label} looks too high`);

export const loginSchema = z.object({
  email: z.string({ required_error: 'Email is required' }).trim().email('Enter a valid email address'),
  password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required').max(200),
});

export const auditSchema = z.object({
  state: z.string({ required_error: 'State is required' }).trim().min(2, 'State is required').max(60),
  monthlyUnits: positiveNumber('Monthly consumption', 20000),
  monthlyBill: positiveNumber('Monthly bill', 1_000_000).optional(),
  userId: z.string().max(64).optional(),
});

export const createApplicationSchema = z.object({
  applicantName: z.string({ required_error: 'Name is required' }).trim().min(2, 'Name must have at least 2 characters').max(80),
  phone,
  location: z.string({ required_error: 'Location is required' }).trim().min(2, 'Location is required').max(120),
  state: z.string({ required_error: 'State is required' }).trim().min(2, 'State is required').max(60),
  monthlyUnits: positiveNumber('Monthly consumption', 20000),
  monthlyBill: positiveNumber('Monthly bill', 1_000_000).optional(),
  vendorId: z.string({ required_error: 'Please select a vendor' }).trim().min(1, 'Please select a vendor'),
  auditId: z.string().max(40).optional(),
  loanAmount: positiveNumber('Loan amount', 10_000_000),
  interestRate: positiveNumber('Interest rate', 36),
  tenureMonths: z.coerce.number().int('Tenure must be whole months').min(0).max(120, 'Tenure cannot exceed 120 months'),
  selectedKW: z.coerce.number().int().min(1).max(10).optional(),
  preferredDate: z.string().max(20).optional(),
  preferredTime: z.string().max(40).optional(),
  note: z.string().trim().max(500).optional(),
  consentGiven: z.boolean().optional(),
  journey: z.object({
    electricity: z.object({ consumerName: z.string().max(80).optional(), consumerNumber: z.string().max(80).optional(), discom: z.string().max(100).optional(), meterNumber: z.string().max(80).optional(), connectionType: z.string().max(60).optional(), sanctionedLoad: z.string().max(40).optional(), billingPeriod: z.string().max(80).optional() }).optional(),
    personal: z.object({ alternateMobile: z.string().max(24).optional(), email: z.string().email().max(254).optional().or(z.literal('')), dateOfBirth: z.string().max(20).optional(), preferredLanguage: z.enum(['en', 'hi', 'gu', 'ta']).optional() }).optional(),
    kyc: z.object({ documentType: z.string().max(40).optional(), documentStatus: z.enum(['demo-collection-only']).optional() }).optional(),
    property: z.object({ ownership: z.string().max(40).optional(), permission: z.boolean().optional(), addressLine1: z.string().max(160).optional(), addressLine2: z.string().max(160).optional(), city: z.string().max(100).optional(), district: z.string().max(100).optional(), state: z.string().max(60).optional(), pinCode: z.string().regex(/^\d{6}$/).optional(), roofType: z.string().max(60).optional(), roofArea: z.number().finite().min(0).max(100000).optional(), shaded: z.string().max(30).optional() }).optional(),
    solar: z.object({ batteryPreference: z.string().max(30).optional(), paymentPreference: z.string().max(40).optional() }).optional(),
    booking: z.object({ preferredDate: z.string().max(20).optional(), preferredTime: z.string().max(40).optional(), note: z.string().max(500).optional(), consentGiven: z.boolean().optional() }).optional(),
  }).optional(),
});

export const statusUpdateSchema = z.object({
  status: z.enum(APPLICATION_STATUSES, { errorMap: () => ({ message: 'Unknown application status' }) }),
  note: z.string().trim().max(300).optional(),
});

export const vendorActiveSchema = z.object({ active: z.boolean({ required_error: 'active must be true or false' }) });

export const vendorQuerySchema = z.object({
  state: z.string().trim().max(60).optional(),
  search: z.string().trim().max(100).optional(),
  active: z.enum(['true', 'false']).optional().transform((v) => (v === undefined ? undefined : v === 'true')),
});

export const leadQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  state: z.string().trim().max(60).optional(),
  status: z.enum(APPLICATION_STATUSES).optional(),
  sortBy: z.enum(['createdAt', 'applicantName', 'systemKW', 'subsidy', 'loanAmount', 'status']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(8),
});
