import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const isTest = process.env.NODE_ENV === 'test';

function resolveJwtSecret(demoMode: boolean): string {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.trim().length > 0) return secret;
  if (!demoMode) {
    throw new Error('JWT_SECRET must be set when DEMO_MODE=false. Copy server/.env.example to server/.env.');
  }
  // Demo convenience: an ephemeral secret means tokens simply expire on server restart.
  if (!isTest) console.warn('[config] JWT_SECRET not set — using an ephemeral secret for demo mode.');
  return crypto.randomBytes(32).toString('hex');
}

const demoMode = (process.env.DEMO_MODE ?? 'true').toLowerCase() !== 'false';

export const env = {
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGO_URI ?? 'mongodb://localhost:27017/solarmitra',
  demoMode,
  jwtSecret: resolveJwtSecret(demoMode),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
  clientUrls: (process.env.CLIENT_URL ?? 'http://localhost:5173')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean),
  // Demo-only admin account. Override with env vars for any real deployment.
  adminEmail: process.env.ADMIN_EMAIL ?? 'admin@solarmitra.demo',
  adminPassword: process.env.ADMIN_PASSWORD ?? 'demo123',
  isTest,
};
