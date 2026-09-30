import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import type { PublicUser, UserRecord, UserRole } from '../types';
import { AppError } from '../utils/AppError';
import { getStore } from './dataStore';

export interface TokenPayload {
  sub: string;
  email: string;
  role: UserRole;
  /** Carried in the token so the audit trail can record who acted. */
  name: string;
  providerId?: string;
}

export const toPublicUser = ({ passwordHash: _passwordHash, ...user }: UserRecord): PublicUser => user;

export function signToken(user: PublicUser): string {
  const payload: TokenPayload = { sub: user.id, email: user.email, role: user.role, name: user.name, providerId: user.providerId };
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn } as SignOptions);
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, env.jwtSecret) as TokenPayload;
}

export async function login(email: string, password: string): Promise<{ token: string; user: PublicUser }> {
  const user = await getStore().findUserByEmail(email);
  // Same message for unknown email and wrong password to avoid account enumeration.
  const valid = user ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!user || !valid) throw new AppError(401, 'Invalid email or password');
  if (user.role === 'consumer' || user.role === 'provider') throw new AppError(403, 'This account does not have operator access');
  const publicUser = toPublicUser(user);
  return { token: signToken(publicUser), user: publicUser };
}
