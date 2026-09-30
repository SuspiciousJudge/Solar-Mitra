import { z } from 'zod';
import { APPLICATION_STATUSES, REJECTION_REASONS, type ApplicationStatus } from '../config/statusFlow';
import { INDIA_REGIONS } from '../data/indiaRegions';
import { SUBSIDY_SCHEMES } from '../config/subsidySchemes';
import { TRANSACTION_KINDS } from '../types';

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

const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Dates must be in YYYY-MM-DD format');

const regionNames = new Set(INDIA_REGIONS.map((region) => region.name));
const schemeIds = new Set(SUBSIDY_SCHEMES.map((scheme) => scheme.id));

/** Accepts `a,b` or repeated params (`?state=UP&state=GJ`). */
const csvList = (label: string, allowed?: Set<string>) =>
  z.preprocess(
    (value) => {
      if (value === undefined || value === null || value === '') return undefined;
      const list = (Array.isArray(value) ? value : String(value).split(',')).map((entry) => String(entry).trim()).filter(Boolean);
      return list.length > 0 ? list : undefined;
    },
    z
      .array(z.string().min(1).max(80))
      .max(60, `Too many ${label} selected`)
      .refine((list) => !allowed || list.every((entry) => allowed.has(entry)), `Unknown ${label} value`)
      .optional(),
  );

const statusList = z.preprocess(
  (value) => {
    if (value === undefined || value === null || value === '') return undefined;
    const list = (Array.isArray(value) ? value : String(value).split(',')).map((entry) => String(entry).trim()).filter(Boolean);
    return list.length > 0 ? list : undefined;
  },
  z.array(z.enum(APPLICATION_STATUSES)).max(11).optional(),
);

export const loginSchema = z.object({
  email: z.string({ required_error: 'Email is required' }).trim().email('Enter a valid email address'),
  password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required').max(200),
});

/** Shared operator filter contract — used by every list, chart and export. */
export const filterQuerySchema = z.object({
  state: csvList('state', regionNames),
  district: csvList('district'),
  discom: csvList('discom'),
  scheme: csvList('scheme', schemeIds),
  status: statusList,
  vendor: csvList('vendor'),
  paymentMode: z.enum(['loan', 'upfront']).optional(),
  assignedTo: z.string().trim().max(64).optional(),
  search: z.string().trim().max(100).optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
  preset: z.string().trim().max(40).optional(),
});

export const auditSchema = z.object({
  state: z.string({
    required_error: 'State is required',
  }).trim().min(2, 'State is required').max(60),

  district: z.string().trim().max(80).optional(),
  discom: z.string().trim().max(120).optional(),
  consumerName: z.string().trim().max(80).optional(),
  consumerNumber: z.string().trim().max(80).optional(),
  meterNumber: z.string().trim().max(80).optional(),
  billingPeriod: z.string().trim().max(80).optional(),
  sanctionedLoad: z.string().trim().max(40).optional(),

  monthlyUnits: positiveNumber('Monthly consumption', 20000),

  monthlyBill: positiveNumber('Monthly bill', 1_000_000).optional(),
  userId: z.string().max(64).optional(),
});


export const createApplicationSchema = z
  .object({
    applicantName: z
      .string({ required_error: 'Name is required' })
      .trim()
      .min(2, 'Name must have at least 2 characters')
      .max(80),

    phone,

    consumerNumber: z.string().trim().max(40).optional(),

    location: z
      .string({ required_error: 'Location is required' })
      .trim()
      .min(2, 'Location is required')
      .max(120),

    state: z
      .string({ required_error: 'State is required' })
      .trim()
      .min(2, 'State is required')
      .max(60),

    district: z.string().trim().max(80).optional(),
    discom: z.string().trim().max(120).optional(),

    monthlyUnits: positiveNumber('Monthly consumption', 20000),

    monthlyBill: positiveNumber('Monthly bill', 1_000_000).optional(),

    vendorId: z
      .string({ required_error: 'Please select a vendor' })
      .trim()
      .min(1, 'Please select a vendor'),

    auditId: z.string().max(40).optional(),

    loanAmount: positiveNumber('Loan amount', 10_000_000),
    interestRate: positiveNumber('Interest rate', 36),

    tenureMonths: z
      .coerce
      .number()
      .int('Tenure must be whole months')
      .min(0)
      .max(120, 'Tenure cannot exceed 120 months'),

    selectedKW: z.coerce.number().int().min(1).max(10).optional(),

    preferredDate: z.string().max(20).optional(),
    preferredTime: z.string().max(40).optional(),
    note: z.string().trim().max(500).optional(),
    consentGiven: z.boolean().optional(),

    journey: z
      .object({
        electricity: z
          .object({
            consumerName: z.string().max(80).optional(),
            consumerNumber: z.string().max(80).optional(),
            discom: z.string().max(100).optional(),
            meterNumber: z.string().max(80).optional(),
            connectionType: z.string().max(60).optional(),
            sanctionedLoad: z.string().max(40).optional(),
            billingPeriod: z.string().max(80).optional(),
          })
          .optional(),

        personal: z
          .object({
            alternateMobile: z.string().max(24).optional(),
            email: z.string().email().max(254).optional().or(z.literal('')),
            dateOfBirth: z.string().max(20).optional(),
            preferredLanguage: z.enum(['en', 'hi', 'gu', 'ta']).optional(),
          })
          .optional(),

        kyc: z
          .object({
            documentType: z.string().max(40).optional(),
            documentStatus: z.enum(['demo-collection-only']).optional(),
          })
          .optional(),

        property: z
          .object({
            ownership: z.string().max(40).optional(),
            permission: z.boolean().optional(),
            addressLine1: z.string().max(160).optional(),
            addressLine2: z.string().max(160).optional(),
            city: z.string().max(100).optional(),
            district: z.string().max(100).optional(),
            state: z.string().max(60).optional(),
            pinCode: z.string().regex(/^\d{6}$/).optional(),
            roofType: z.string().max(60).optional(),
            roofArea: z.number().finite().min(0).max(100000).optional(),
            shaded: z.string().max(30).optional(),
          })
          .optional(),

        solar: z
          .object({
            batteryPreference: z.string().max(30).optional(),
            paymentPreference: z.string().max(40).optional(),
          })
          .optional(),

        booking: z
          .object({
            preferredDate: z.string().max(20).optional(),
            preferredTime: z.string().max(40).optional(),
            note: z.string().max(500).optional(),
            consentGiven: z.boolean().optional(),
          })
          .optional(),
      })
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (value.loanAmount > 0 && value.tenureMonths < 6) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['tenureMonths'],
        message: 'Loan tenure must be at least 6 months',
      });
    }
  });

export const statusUpdateSchema = z
  .object({
    status: z.enum(APPLICATION_STATUSES, {
      errorMap: () => ({ message: 'Unknown application status' }),
    }),
    note: z.string().trim().max(300).optional(),
    reason: z.enum(REJECTION_REASONS, {
      errorMap: () => ({ message: 'Unknown rejection reason' }),
    }).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.status === 'Rejected' && !value.reason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['reason'],
        message: 'A rejection reason is required',
      });
    }
  });


export const assignSchema = z
  .object({
    /** null explicitly unassigns the lead. */
    userId: z.string().trim().max(64).nullable().optional(),
    assignToMe: z.boolean().optional(),
  })
  .refine((value) => value.userId !== undefined || value.assignToMe !== undefined, 'Provide a userId or assignToMe');

export const transactionSchema = z.object({
  applicationId: z.string({ required_error: 'Application is required' }).trim().min(1, 'Application is required').max(40),
  kind: z.enum(TRANSACTION_KINDS as [string, ...string[]], { errorMap: () => ({ message: 'Unknown transaction type' }) }),
  amountINR: positiveNumber('Amount', 100_000_000).refine((v) => v > 0, 'Amount must be greater than 0'),
  dpd: z.coerce.number().int().min(0).max(365).optional(),
  reference: z.string().trim().max(80).optional(),
  note: z.string().trim().max(300).optional(),
  at: z.string().trim().max(40).optional(),
});

export const transactionQuerySchema = filterQuerySchema.extend({
  kind: csvList('transaction type'),
  sortBy: z.enum(['at', 'amountINR', 'kind']).default('at'),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const vendorActiveSchema = z.object({ active: z.boolean({ required_error: 'active must be true or false' }) });

export const vendorQuerySchema = z.object({
  state: z.string().trim().max(60).optional(),
  district: z.string().trim().max(80).optional(),
  search: z.string().trim().max(100).optional(),
  active: z.enum(['true', 'false']).optional().transform((v) => (v === undefined ? undefined : v === 'true')),
});

export const leadQuerySchema = filterQuerySchema.extend({
  sortBy: z.enum(['createdAt', 'applicantName', 'systemKW', 'subsidy', 'loanAmount', 'status', 'updatedAt']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(8),
});

export const duplicateQuerySchema = z.object({
  phone: z.string().trim().max(20).optional(),
  consumerNumber: z.string().trim().max(40).optional(),
});

export const schemeQuerySchema = z.object({
  level: z.enum(['central', 'state']).optional(),
  state: z.string().trim().max(60).optional(),
  category: z.enum(['residential_rooftop', 'group_housing', 'agriculture_pump', 'agriculture_grid', 'commercial']).optional(),
});

export type FilterQuery = z.infer<typeof filterQuerySchema>;
export type { ApplicationStatus };
