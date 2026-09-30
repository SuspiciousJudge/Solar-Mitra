import { z } from 'zod';
import { INDIA_REGIONS } from '../data/indiaRegions';
import {
  ACCOUNT_REGEX,
  ACCOUNT_TYPES,
  BUSINESS_TYPES,
  CHECKLIST_KEYS,
  CIN_REGEX,
  DOCUMENT_TYPES,
  GSTIN_REGEX,
  IFSC_REGEX,
  LLPIN_REGEX,
  MOBILE_REGEX,
  PAN_REGEX,
  PIN_REGEX,
  PROVIDER_REJECTION_CODES,
  PROVIDER_STEPS,
  UDYAM_REGEX,
  gstinStateCodeForName,
  isValidGstinChecksum,
  licenceExpiryFlag,
  normalizeMobile,
  panFourthMatchesBusiness,
  panFromGstin,
  passwordIssues,
  type BusinessType,
} from './providerRules';

const regionNames = new Set(INDIA_REGIONS.map((region) => region.name));
const currentYear = new Date().getFullYear();

const optionalString = (max: number) => z.string().trim().max(max).optional().or(z.literal(''));

export const mobileField = z
  .string({ required_error: 'Mobile number is required' })
  .trim()
  .transform(normalizeMobile)
  .refine((value) => MOBILE_REGEX.test(value), 'Enter a valid 10-digit Indian mobile number starting with 6–9');

export const optionalMobileField = z
  .string()
  .trim()
  .transform((value) => (value ? normalizeMobile(value) : ''))
  .refine((value) => !value || MOBILE_REGEX.test(value), 'Enter a valid 10-digit Indian mobile number')
  .optional();

export const passwordField = z
  .string({ required_error: 'Password is required' })
  .max(200)
  .superRefine((value, ctx) => {
    const issue = passwordIssues(value);
    if (issue) ctx.addIssue({ code: z.ZodIssueCode.custom, message: issue });
  });

export const providerRegisterSchema = z
  .object({
    name: z.string({ required_error: 'Full name is required' }).trim().min(2, 'Enter your full name').max(80),
    email: z.string({ required_error: 'Business email is required' }).trim().email('Enter a valid email address').max(254),
    mobile: mobileField,
    password: passwordField,
    confirmPassword: z.string({ required_error: 'Please confirm your password' }),
    acceptTerms: z.literal(true, { errorMap: () => ({ message: 'Please accept the partner terms' }) }),
    otp: z.string({ required_error: 'Enter the OTP sent to your mobile' }).trim(),
  })
  .superRefine((value, ctx) => {
    if (value.password !== value.confirmPassword) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['confirmPassword'], message: 'Passwords do not match' });
    }
  });

export const providerLoginSchema = z.object({
  email: z.string({ required_error: 'Email is required' }).trim().email('Enter a valid email address'),
  password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required').max(200),
});

const addressSchema = z.object({
  line1: z.string().trim().max(160).optional(),
  line2: z.string().trim().max(160).optional(),
  city: z.string().trim().max(80).optional(),
  district: z.string().trim().max(80).optional(),
  state: z.string().trim().max(80).optional(),
  pin: z.string().trim().max(6).optional(),
});

const principalSchema = z.object({
  name: z.string().trim().max(80).optional(),
  designation: z.string().trim().max(80).optional(),
  mobile: optionalMobileField,
  email: z.string().trim().email('Enter a valid email').max(254).optional().or(z.literal('')),
  din: z.string().trim().max(20).optional(),
});

export const stepBusinessSchema = z.object({
  legalName: z.string().trim().max(160).optional(),
  tradeName: z.string().trim().max(160).optional(),
  businessType: z.enum(BUSINESS_TYPES).optional(),
  principals: z.array(principalSchema).max(12).optional(),
  yearEstablished: z.coerce.number().int().min(1950).max(currentYear).optional(),
  registeredAddress: addressSchema.optional(),
  operationalAddress: addressSchema.optional(),
  sameAsRegistered: z.boolean().optional(),
  website: z
    .string()
    .trim()
    .max(200)
    .optional()
    .refine((value) => !value || /^https?:\/\//i.test(value), 'Website must start with http:// or https://'),
  companyEmail: z.string().trim().email('Enter a valid company email').max(254).optional().or(z.literal('')),
  officeLandline: z.string().trim().max(20).optional(),
});

export const stepStatutorySchema = z.object({
  gstin: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .refine((value) => !value || GSTIN_REGEX.test(value), 'GSTIN format is invalid')
    .refine((value) => !value || isValidGstinChecksum(value), 'GSTIN checksum is invalid')
    .optional(),
  pan: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .refine((value) => !value || PAN_REGEX.test(value), 'PAN format is invalid')
    .optional(),
  udyam: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .refine((value) => !value || UDYAM_REGEX.test(value), 'Udyam number format is invalid')
    .optional()
    .or(z.literal('')),
  cin: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .refine((value) => !value || CIN_REGEX.test(value), 'CIN format is invalid')
    .optional()
    .or(z.literal('')),
  llpin: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .refine((value) => !value || LLPIN_REGEX.test(value), 'LLPIN format is invalid')
    .optional()
    .or(z.literal('')),
  tradeLicence: z.string().trim().max(40).optional(),
});

export const stepCredentialsSchema = z.object({
  electricalLicenceNo: z.string().trim().max(40).optional(),
  electricalLicenceAuthority: z.string().trim().max(120).optional(),
  electricalLicenceValidTill: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
    .optional()
    .or(z.literal('')),
  discomEmpanelled: z.boolean().optional(),
  discomNames: z.array(z.string().trim().max(120)).max(12).optional(),
  empanelmentNo: z.string().trim().max(40).optional(),
  empanelmentValidTill: z.string().trim().max(20).optional(),
  nationalPortalVendorId: z.string().trim().max(40).optional(),
  mnreRegistration: z.string().trim().max(40).optional(),
  panelBrands: z.array(z.string().trim().max(60)).max(20).optional(),
  panelBrandsOther: z.string().trim().max(80).optional(),
  almmListed: z.boolean().optional(),
  dcrModules: z.boolean().optional(),
  inverterBrands: z.array(z.string().trim().max(60)).max(20).optional(),
  certifications: z.array(z.string().trim().max(60)).max(12).optional(),
  insurancePolicyNo: z.string().trim().max(40).optional(),
  insuranceValidTill: z.string().trim().max(20).optional(),
  insuranceType: z.string().trim().max(80).optional(),
});

const referenceSchema = z.object({
  name: z.string().trim().max(80).optional(),
  city: z.string().trim().max(80).optional(),
  systemKw: z.coerce.number().min(0).max(10_000).optional(),
  installationMonth: z.string().trim().max(20).optional(),
  phone: optionalMobileField,
});

export const stepExperienceSchema = z.object({
  yearsExperience: z.coerce.number().min(0).max(80).optional(),
  totalInstallations: z.coerce.number().int().min(0).max(1_000_000).optional(),
  totalCapacityKw: z.coerce.number().min(0).max(10_000_000).optional(),
  segmentResidential: z.coerce.number().int().min(0).max(1_000_000).optional(),
  segmentCommercial: z.coerce.number().int().min(0).max(1_000_000).optional(),
  segmentAgricultural: z.coerce.number().int().min(0).max(1_000_000).optional(),
  segmentGroupHousing: z.coerce.number().int().min(0).max(1_000_000).optional(),
  largestProjectKw: z.coerce.number().min(0).max(100_000).optional(),
  typicalSizes: z.array(z.coerce.number().int().min(1).max(10)).max(8).optional(),
  engineers: z.coerce.number().int().min(0).max(10_000).optional(),
  certifiedElectricians: z.coerce.number().int().min(0).max(10_000).optional(),
  installers: z.coerce.number().int().min(0).max(10_000).optional(),
  serviceStaff: z.coerce.number().int().min(0).max(10_000).optional(),
  capacityPerMonth: z.coerce.number().int().min(0).max(10_000).optional(),
  avgTurnaroundDays: z.coerce.number().min(0).max(365).optional(),
  afterSalesHours: z.coerce.number().min(0).max(720).optional(),
  workmanshipWarrantyYears: z.coerce.number().int().min(0).max(30).optional(),
  equipmentWarranty: z.string().trim().max(200).optional(),
  amcOffered: z.boolean().optional(),
  amcDetails: z.string().trim().max(400).optional(),
  pricePerKw: z
    .object({
      kw1: z.coerce.number().min(0).max(500_000).optional(),
      kw2: z.coerce.number().min(0).max(500_000).optional(),
      kw3: z.coerce.number().min(0).max(500_000).optional(),
      kw5: z.coerce.number().min(0).max(500_000).optional(),
    })
    .optional(),
  references: z.array(referenceSchema).max(10).optional(),
});

export const stepServiceAreaSchema = z.object({
  states: z.array(z.string().trim().max(80)).max(36).optional(),
  districtsByState: z.record(z.array(z.string().trim().max(80)).max(80)).optional(),
  pinCodes: z.array(z.string().regex(PIN_REGEX, 'PIN must be 6 digits')).max(200).optional(),
  pinCsv: z.string().max(4000).optional(),
  maxRadiusKm: z.coerce.number().min(0).max(2000).optional(),
  languages: z.array(z.string().trim().max(40)).max(16).optional(),
});

export const stepBankSchema = z
  .object({
    accountHolderName: z.string().trim().max(120).optional(),
    accountNumber: z
      .string()
      .trim()
      .refine((value) => !value || ACCOUNT_REGEX.test(value), 'Account number must be 9–18 digits')
      .optional(),
    accountNumberConfirm: z.string().trim().optional(),
    ifsc: z
      .string()
      .trim()
      .transform((value) => value.toUpperCase())
      .refine((value) => !value || IFSC_REGEX.test(value), 'IFSC format is invalid')
      .optional(),
    accountType: z.enum(ACCOUNT_TYPES).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.accountNumber && value.accountNumberConfirm && value.accountNumber !== value.accountNumberConfirm) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['accountNumberConfirm'], message: 'Account numbers do not match' });
    }
  });

export const stepContactSchema = z.object({
  signatoryName: z.string().trim().max(80).optional(),
  designation: z.string().trim().max(80).optional(),
  mobile: optionalMobileField,
  email: z.string().trim().email('Enter a valid email').max(254).optional().or(z.literal('')),
  aadhaarLast4: z
    .string()
    .trim()
    .refine((value) => !value || /^\d{4}$/.test(value), 'Store only the last 4 digits of Aadhaar')
    .optional(),
  informationTrue: z.boolean().optional(),
  agreeTerms: z.boolean().optional(),
  agreeStandards: z.boolean().optional(),
  consentVerification: z.boolean().optional(),
  notBlacklisted: z.boolean().optional(),
  blacklistingExplanation: z.string().trim().max(500).optional(),
  signatureName: z.string().trim().max(80).optional(),
});

export const providerStepSchemas = {
  business: stepBusinessSchema,
  statutory: stepStatutorySchema,
  credentials: stepCredentialsSchema,
  experience: stepExperienceSchema,
  serviceArea: stepServiceAreaSchema,
  bank: stepBankSchema,
  contact: stepContactSchema,
} as const;

export const providerStepParamSchema = z.object({
  step: z.enum(PROVIDER_STEPS, { errorMap: () => ({ message: 'Unknown application step' }) }),
});

export const documentTypeSchema = z.object({
  type: z.enum(DOCUMENT_TYPES, { errorMap: () => ({ message: 'Unknown document type' }) }),
});

export const assignReviewerSchema = z.object({
  reviewerId: z.string().trim().min(1).max(64).optional(),
  assignToMe: z.boolean().optional(),
});

export const checklistPatchSchema = z.object({
  itemKey: z.enum(CHECKLIST_KEYS, { errorMap: () => ({ message: 'Unknown checklist item' }) }),
  status: z.enum(['pending', 'pass', 'fail']),
  note: z.string().trim().max(400).optional(),
});

export const documentVerifySchema = z.object({
  verification: z.enum(['pending', 'verified', 'rejected']),
  remark: z.string().trim().max(400).optional(),
});

export const requestChangesSchema = z.object({
  fields: z.array(z.string().trim().max(80)).max(40).default([]),
  documents: z.array(z.string().trim().max(40)).max(20).default([]),
  message: z.string().trim().min(1, 'A message for the provider is required').max(1000),
});

export const approveProviderSchema = z.object({
  note: z.string().trim().max(400).optional(),
  tier: z.enum(['Standard', 'Preferred']).optional(),
});

export const rejectProviderSchema = z.object({
  reasonCode: z.enum(PROVIDER_REJECTION_CODES, { errorMap: () => ({ message: 'Unknown rejection reason' }) }),
  message: z.string().trim().min(1, 'A rejection message is required').max(1000),
});

export const suspendSchema = z.object({
  reason: z.string().trim().min(1, 'A reason is required').max(500),
});

export const revealQuerySchema = z.object({
  reveal: z.enum(['bank']).optional(),
});

export const installerUpdateSchema = z.object({
  kind: z.enum(['site_visit_done', 'installation_scheduled', 'installed']),
  date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
  note: z.string().trim().max(400).optional(),
});

export const profilePatchSchema = z.object({
  website: optionalString(200),
  officeLandline: optionalString(20),
  companyEmail: z.string().trim().email().max(254).optional().or(z.literal('')),
  languages: z.array(z.string().trim().max(40)).max(16).optional(),
  afterSalesHours: z.coerce.number().min(0).max(720).optional(),
  amcDetails: optionalString(400),
});

export const sensitiveChangeSchema = z.object({
  gstin: z.string().trim().max(15).optional(),
  pan: z.string().trim().max(10).optional(),
  electricalLicenceNo: z.string().trim().max(40).optional(),
  electricalLicenceValidTill: z.string().trim().max(20).optional(),
  accountHolderName: z.string().trim().max(120).optional(),
  accountNumber: z.string().trim().max(18).optional(),
  ifsc: z.string().trim().max(11).optional(),
  note: z.string().trim().max(400).optional(),
});

const csvList = () =>
  z.preprocess((value) => {
    if (value === undefined || value === null || value === '') return undefined;
    const list = (Array.isArray(value) ? value : String(value).split(',')).map((entry) => String(entry).trim()).filter(Boolean);
    return list.length > 0 ? list : undefined;
  }, z.array(z.string().min(1).max(80)).max(40).optional());

export const providerListQuerySchema = z.object({
  status: csvList(),
  state: csvList(),
  district: csvList(),
  businessType: csvList(),
  yearsMin: z.coerce.number().int().min(0).max(80).optional(),
  yearsMax: z.coerce.number().int().min(0).max(80).optional(),
  experienceMin: z.coerce.number().min(0).max(80).optional(),
  experienceMax: z.coerce.number().min(0).max(80).optional(),
  installationsMin: z.coerce.number().int().min(0).optional(),
  installationsMax: z.coerce.number().int().min(0).optional(),
  discomEmpanelled: z.enum(['true', 'false']).optional(),
  hasRiskFlags: z.enum(['true', 'false']).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  search: z.string().trim().max(100).optional(),
  sortBy: z.enum(['submittedAt', 'completeness', 'experience', 'legalName']).default('submittedAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export function statutoryCrossFieldErrors(input: {
  gstin?: string;
  pan?: string;
  businessType?: BusinessType;
  registeredState?: string;
}): { path: string; message: string }[] {
  const errors: { path: string; message: string }[] = [];
  const gstin = input.gstin?.toUpperCase();
  const pan = input.pan?.toUpperCase();
  if (gstin && pan && panFromGstin(gstin) !== pan) {
    errors.push({ path: 'gstin', message: 'PAN embedded in GSTIN does not match the PAN field' });
  }
  if (gstin && input.registeredState) {
    const expected = gstinStateCodeForName(input.registeredState);
    if (expected && gstin.slice(0, 2) !== expected) {
      errors.push({ path: 'gstin', message: `GSTIN state code should be ${expected} for ${input.registeredState}` });
    }
  }
  if (pan && input.businessType && !panFourthMatchesBusiness(pan, input.businessType)) {
    errors.push({
      path: 'pan',
      message: `4th character of PAN must match ${input.businessType}`,
    });
  }
  return errors;
}

export function licenceFutureError(validTill?: string): string | undefined {
  if (!validTill) return undefined;
  const flag = licenceExpiryFlag(validTill);
  if (flag === 'expired') return 'Licence valid-till date must be in the future';
  return undefined;
}

export const idParamSchema = z.object({ id: z.string().trim().min(1).max(40) });
export const docIdParamSchema = z.object({ docId: z.string().trim().min(1).max(80) });
export const vendorIdParamSchema = z.object({ vendorId: z.string().trim().min(1).max(40) });

export { regionNames };
