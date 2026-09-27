import { initDataStore, getDatabaseState } from './config/database';
import { env } from './config/env';
import { createApp } from './app';

async function start() {
  await initDataStore();
  const app = createApp();
  app.listen(env.port, '0.0.0.0', () => {
    console.log(`☀️  SolarMitra API running on http://localhost:${env.port} (data: ${getDatabaseState()})`);
  });
}

start().catch((error) => {
  console.error('[server] Failed to start', error);
  process.exit(1);
});
