import { Schema, model } from 'mongoose';

export interface UserDoc {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'agent' | 'consumer';
}

const userSchema = new Schema<UserDoc>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Stores the bcrypt hash — never the plain-text password.
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['admin', 'agent', 'consumer'], default: 'consumer' },
  },
  { timestamps: true },
);

export const UserModel = model<UserDoc>('User', userSchema);
