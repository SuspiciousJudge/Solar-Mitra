import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimit';
import { router } from './routes';
import { sendSuccess } from './utils/apiResponse';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        // Allow same-origin/server-to-server requests and configured client URLs.
        // In demo mode any origin is allowed so preview/tunnel URLs keep working.
        if (!origin || env.demoMode || env.clientUrls.includes(origin)) return callback(null, true);
        return callback(null, false);
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '100kb' }));
  if (!env.isTest) app.use('/api', apiLimiter);

  app.get('/', (_req, res) => sendSuccess(res, { name: 'SolarMitra API', docs: '/api/health' }));
  app.use('/api', router);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
