import { Schema, model } from 'mongoose';

export interface VendorDoc {
  code: string;
  name: string;
  location: string;
  state: string;
  district?: string;
  rating: number;
  distanceKm: number;
  installations: number;
  empanelled: boolean;
  verified: boolean;
  active: boolean;
  phone: string;
  yearsInBusiness: number;
  specialities: string[];
  source?: 'seeded' | 'onboarded';
  tier?: 'Standard' | 'Preferred';
  providerApplicationId?: string;
  licenceExpiry?: string;
  serviceStates?: string[];
  suspendReason?: string;
}

const vendorSchema = new Schema<VendorDoc>(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    location: { type: String, required: true },
    state: { type: String, required: true, index: true },
    district: { type: String },
    rating: { type: Number, min: 0, max: 5, default: 0 },
    distanceKm: { type: Number, default: 0 },
    installations: { type: Number, default: 0 },
    empanelled: { type: Boolean, default: false },
    verified: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    phone: { type: String, default: '' },
    yearsInBusiness: { type: Number, default: 0 },
    specialities: { type: [String], default: [] },
    source: { type: String, enum: ['seeded', 'onboarded'] },
    tier: { type: String, enum: ['Standard', 'Preferred'] },
    providerApplicationId: { type: String },
    licenceExpiry: { type: String },
    serviceStates: { type: [String], default: undefined },
    suspendReason: { type: String },
  },
  { timestamps: true },
);

export const VendorModel = model<VendorDoc>('Vendor', vendorSchema);
