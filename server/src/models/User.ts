import { Schema, model } from 'mongoose';

export interface UserDoc {
  /** Stable operator code (U-ADMIN, U-AGENT-1, …) — used by the audit trail. */
  code: string;
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'agent' | 'finance' | 'consumer' | 'provider';
  mobile?: string;
  providerId?: string;
}

const userSchema = new Schema<UserDoc>(
  {
    code: { type: String, unique: true, sparse: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Stores the bcrypt hash — never the plain-text password.
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['admin', 'agent', 'finance', 'consumer', 'provider'], default: 'consumer' },
    mobile: { type: String },
    providerId: { type: String },
  },
  { timestamps: true },
);

export const UserModel = model<UserDoc>('User', userSchema);
