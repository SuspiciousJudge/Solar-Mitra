import { Schema, model } from 'mongoose';

export interface LoanDoc {
  applicationId: string;
  principal: number;
  annualInterestRate: number;
  tenureMonths: number;
  emi: number;
  lender: string;
  status: 'Requested' | 'Approved' | 'Rejected' | 'Disbursed';
}

const loanSchema = new Schema<LoanDoc>(
  {
    applicationId: { type: String, required: true, unique: true },
    principal: { type: Number, required: true, min: 0 },
    annualInterestRate: { type: Number, required: true },
    tenureMonths: { type: Number, required: true },
    emi: { type: Number, required: true },
    lender: { type: String, default: 'Satin Finserv' },
    status: { type: String, enum: ['Requested', 'Approved', 'Rejected', 'Disbursed'], default: 'Requested' },
  },
  { timestamps: true },
);

export const LoanModel = model<LoanDoc>('Loan', loanSchema);
