import { Schema, model } from 'mongoose';
import type { ProviderApplication } from '../types/provider';

export type ProviderApplicationDoc = Omit<ProviderApplication, 'id' | 'createdAt' | 'updatedAt'> & {
  applicationId: string;
  createdAt: Date;
  updatedAt: Date;
};

const providerApplicationSchema = new Schema<ProviderApplicationDoc>(
  {
    applicationId: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    status: { type: String, required: true },
    businessDetails: { type: Schema.Types.Mixed, default: {} },
    statutory: { type: Schema.Types.Mixed, default: {} },
    credentials: { type: Schema.Types.Mixed, default: {} },
    experience: { type: Schema.Types.Mixed, default: {} },
    serviceArea: { type: Schema.Types.Mixed, default: {} },
    bank: { type: Schema.Types.Mixed, default: {} },
    contact: { type: Schema.Types.Mixed, default: {} },
    declarations: { type: Schema.Types.Mixed, default: {} },
    documents: { type: Schema.Types.Mixed, default: [] },
    completeness: { type: Number, default: 0 },
    missing: { type: [String], default: [] },
    riskFlags: { type: [String], default: [] },
    checklist: { type: Schema.Types.Mixed, default: {} },
    assignedReviewer: { type: Schema.Types.Mixed },
    timeline: { type: Schema.Types.Mixed, default: [] },
    submittedAt: { type: String },
    decidedAt: { type: String },
    providerId: { type: String },
    tier: { type: String },
    changeRequest: { type: Schema.Types.Mixed },
    rejectReason: { type: Schema.Types.Mixed },
    suspendReason: { type: String },
  },
  { timestamps: true },
);

export const ProviderApplicationModel = model<ProviderApplicationDoc>('ProviderApplication', providerApplicationSchema);
