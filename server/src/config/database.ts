import mongoose from 'mongoose';
import { env } from './env';
import { setStore, type DataStore } from '../services/dataStore';
import { createMemoryStore } from '../services/memoryStore';
import { createMongoStore, seedMongo } from '../services/mongoStore';

export type DatabaseState = 'demo' | 'connected' | 'fallback-demo';

let databaseState: DatabaseState = 'demo';

export const getDatabaseState = (): DatabaseState => databaseState;

/**
 * DEMO_MODE=true  → in-memory seeded store.
 * DEMO_MODE=false → MongoDB. If MongoDB is unreachable we fall back to the
 * in-memory store so the demo never crashes in front of an audience.
 */
export async function initDataStore(): Promise<DataStore> {
  if (env.demoMode) {
    const store = createMemoryStore();
    setStore(store);
    databaseState = 'demo';
    return store;
  }

  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 5000 });
    await seedMongo();
    const store = createMongoStore();
    setStore(store);
    databaseState = 'connected';
    console.log('[database] Connected to MongoDB');
    return store;
  } catch (error) {
    console.warn('[database] MongoDB unavailable — falling back to in-memory demo data.', (error as Error).message);
    const store = createMemoryStore();
    setStore(store);
    databaseState = 'fallback-demo';
    return store;
  }
}

export const isServingDemoData = (): boolean => databaseState !== 'connected';
