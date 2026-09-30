import { Schema, model } from 'mongoose';

export interface SolarAuditDoc {
  auditId: string;
  userId?: string;
  state: string;
  district?: string;
  discom?: string;
  consumerName?: string;
  consumerNumber?: string;
  meterNumber?: string;
  billingPeriod?: string;
  sanctionedLoad?: string;
  monthlyUnits: number;
  monthlyBill: number;
  recommendedKW: number;
  marketCost: number;
  subsidy: number;
  centralSubsidy: number;
  stateSupport: number;
  netCost: number;
  estimatedMonthlyGeneration: number;
  estimatedMonthlySavings: number;
  createdAt: Date;
}

const solarAuditSchema = new Schema<SolarAuditDoc>(
  {
    auditId: { type: String, required: true, unique: true },
    userId: { type: String },
    state: { type: String, required: true },
    district: { type: String },
    discom: { type: String },
    consumerName: { type: String },
    consumerNumber: { type: String },
    meterNumber: { type: String },
    billingPeriod: { type: String },
    sanctionedLoad: { type: String },
    monthlyUnits: { type: Number, required: true, min: 0 },
    monthlyBill: { type: Number, required: true, min: 0 },
    recommendedKW: { type: Number, required: true },
    marketCost: { type: Number, required: true },
    subsidy: { type: Number, required: true },
    centralSubsidy: { type: Number, required: true },
    stateSupport: { type: Number, required: true },
    netCost: { type: Number, required: true },
    estimatedMonthlyGeneration: { type: Number, default: 0 },
    estimatedMonthlySavings: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const SolarAuditModel = model<SolarAuditDoc>('SolarAudit', solarAuditSchema);
