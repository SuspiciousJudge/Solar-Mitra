/**
 * Seeds MongoDB with the demo admin, vendors, leads/applications and loans.
 * Idempotent — running it repeatedly never creates duplicates.
 *   npm run seed            (from repo root or /server)
 */
import mongoose from 'mongoose';
import { env } from '../config/env';
import { ApplicationModel, LeadModel, LoanModel, UserModel, VendorModel } from '../models';
import { seedMongo } from '../services/mongoStore';

async function run() {
  console.log(`[seed] Connecting to ${env.mongoUri.replace(/\/\/[^@]*@/, '//***@')}`);
  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 5000 });
  await seedMongo();
  const [users, vendors, applications, leads, loans] = await Promise.all([
    UserModel.countDocuments(),
    VendorModel.countDocuments(),
    ApplicationModel.countDocuments(),
    LeadModel.countDocuments(),
    LoanModel.countDocuments(),
  ]);
  console.log(`[seed] Done. users=${users} vendors=${vendors} applications=${applications} leads=${leads} loans=${loans}`);
  console.log('[seed] Analytics baselines are served from server/src/data/mockDatabase.ts');
  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error('[seed] Failed:', (error as Error).message);
  console.error('[seed] Is MongoDB running? Try: docker compose up -d');
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
