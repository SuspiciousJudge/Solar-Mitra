import { Schema, model } from 'mongoose';
import { APPLICATION_STATUSES, type ApplicationStatus } from '../types';

/** A lead is the CRM view of an application in the operator pipeline. */
export interface LeadDoc {
  applicationId: string;
  name: string;
  phone: string;
  state: string;
  source: 'consumer-app' | 'field-agent' | 'seed';
  status: ApplicationStatus;
}

const leadSchema = new Schema<LeadDoc>(
  {
    applicationId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    state: { type: String, required: true },
    source: { type: String, enum: ['consumer-app', 'field-agent', 'seed'], default: 'consumer-app' },
    status: { type: String, enum: APPLICATION_STATUSES, default: 'Pending Verification' },
  },
  { timestamps: true },
);

export const LeadModel = model<LeadDoc>('Lead', leadSchema);
