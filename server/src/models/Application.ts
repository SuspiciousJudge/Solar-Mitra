import { Schema, model } from 'mongoose';
import { APPLICATION_STATUSES, type Application } from '../types';

export type ApplicationDoc = Omit<Application, 'id' | 'createdAt' | 'updatedAt' | 'vendorName'> & {
  applicationId: string;
  createdAt: Date;
  updatedAt: Date;
};

const timelineSchema = new Schema(
  {
    status: { type: String, required: true },
    note: { type: String, default: '' },
    at: { type: String, required: true },
    byUserId: { type: String },
    byName: { type: String },
    role: { type: String, enum: ['admin', 'agent', 'finance', 'consumer'] },
    reason: { type: String },
  },
  { _id: false },
);

const assignmentSchema = new Schema(
  {
    userId: { type: String, required: true },
    name: { type: String, required: true },
    at: { type: String, required: true },
    byUserId: { type: String },
    byName: { type: String },
  },
  { _id: false },
);

const repaymentSchema = new Schema(
  {
    emisDue: { type: Number, default: 0 },
    paidOnTime: { type: Number, default: 0 },
    paidLate: { type: Number, default: 0 },
    paid30PlusDpd: { type: Number, default: 0 },
    outstandingPrincipal: { type: Number, default: 0 },
  },
  { _id: false },
);

const applicationSchema = new Schema<ApplicationDoc>(
  {
    applicationId: { type: String, required: true, unique: true },
    applicantName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, index: true },
    consumerNumber: { type: String, index: true },
    location: { type: String, required: true },
    state: { type: String, required: true, index: true },
    district: { type: String, index: true },
    discom: { type: String },
    auditId: { type: String },
    vendorId: { type: String, required: true, index: true },
    selectedKW: { type: Number },
    preferredDate: { type: String },
    preferredTime: { type: String },
    installerNote: { type: String, maxlength: 500 },
    consentGiven: { type: Boolean, default: false },
    journey: { type: Schema.Types.Mixed },
    // Snapshot of the audit & financing at submission time, so later policy
    // changes never rewrite what the household was shown.
    monthlyUnits: { type: Number, required: true },
    monthlyBill: { type: Number, required: true },
    systemKW: { type: Number, required: true },
    marketCost: { type: Number, required: true },
    centralSubsidy: { type: Number, required: true },
    stateSubsidy: { type: Number, required: true },
    subsidy: { type: Number, required: true },
    netCost: { type: Number, required: true },
    loanAmount: { type: Number, required: true },
    interestRate: { type: Number, required: true },
    tenureMonths: { type: Number, required: true },
    emi: { type: Number, required: true },
    paymentMode: { type: String, enum: ['loan', 'upfront'], default: 'upfront', index: true },
    schemeIds: { type: [String], default: [] },
    status: { type: String, enum: APPLICATION_STATUSES, default: 'Pending Verification', index: true },
    timeline: { type: [timelineSchema], default: [] },
    assignedTo: { type: assignmentSchema },
    repayment: { type: repaymentSchema },
    estimatedMonthlyGeneration: { type: Number, default: 0 },
    estimatedMonthlySavings: { type: Number, default: 0 },
    isSeed: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const ApplicationModel = model<ApplicationDoc>('Application', applicationSchema);
