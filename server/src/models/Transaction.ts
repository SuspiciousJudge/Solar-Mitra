import { Schema, model } from 'mongoose';
import { TRANSACTION_KINDS, type Transaction } from '../types';

export type TransactionDoc = Omit<Transaction, 'id'> & { transactionId: string; createdAt: Date; updatedAt: Date };

const transactionSchema = new Schema<TransactionDoc>(
  {
    transactionId: { type: String, required: true, unique: true },
    applicationId: { type: String, required: true, index: true },
    applicantName: { type: String, default: '' },
    kind: { type: String, enum: TRANSACTION_KINDS, required: true, index: true },
    direction: { type: String, enum: ['inflow', 'outflow', 'none'], required: true },
    amountINR: { type: Number, required: true, min: 0 },
    dpd: { type: Number, min: 0 },
    state: { type: String, required: true, index: true },
    district: { type: String },
    discom: { type: String },
    schemeIds: { type: [String], default: [] },
    vendorId: { type: String, index: true },
    paymentMode: { type: String, enum: ['loan', 'upfront'], required: true },
    reference: { type: String },
    note: { type: String },
    at: { type: String, required: true, index: true },
    byUserId: { type: String, required: true },
    byName: { type: String, required: true },
    role: { type: String, enum: ['admin', 'agent', 'finance', 'consumer'], required: true },
    isSeed: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const TransactionModel = model<TransactionDoc>('Transaction', transactionSchema);
