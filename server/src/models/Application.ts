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
  },
  { _id: false },
);

const applicationSchema = new Schema<ApplicationDoc>(
  {
    applicationId: { type: String, required: true, unique: true },
    applicantName: { type: String, required: true, trim: true },
    phone: { type: String, required: true },
    location: { type: String, required: true },
    state: { type: String, required: true, index: true },
    auditId: { type: String },
    vendorId: { type: String, required: true },
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
    status: { type: String, enum: APPLICATION_STATUSES, default: 'Pending Verification', index: true },
    timeline: { type: [timelineSchema], default: [] },
    isSeed: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const ApplicationModel = model<ApplicationDoc>('Application', applicationSchema);
