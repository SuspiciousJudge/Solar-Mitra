import cors from 'cors';
import express from 'express';
import fs from 'fs';
import helmet from 'helmet';
import path from 'path';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimit';
import { router } from './routes';
import { sendSuccess } from './utils/apiResponse';

// Built SPA (client/dist). Resolved from __dirname so it works identically from
// src/ (dev via tsx) and dist/ (production): one server hosts API + website.
const clientDist = path.resolve(__dirname, '../../client/dist');
const clientBuilt = fs.existsSync(path.join(clientDist, 'index.html'));

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  // Helmet's default CSP (minus 'upgrade-insecure-requests', which would break
  // plain-HTTP deployments such as a single EC2 box) plus what the built SPA
  // needs at runtime:
  //  - the bill-OCR feature (tesseract.js) fetches its worker, WASM core and
  //    language data from cdn.jsdelivr.net and runs them in a blob worker;
  //  - WebAssembly compilation requires 'wasm-unsafe-eval'.
  // Put the app behind HTTPS (ALB / CloudFront) for real use.
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          'default-src': ["'self'"],
          'base-uri': ["'self'"],
          'font-src': ["'self'", 'data:'],
          'form-action': ["'self'"],
          'frame-ancestors': ["'self'"],
          'img-src': ["'self'", 'data:', 'blob:'],
          'object-src': ["'none'"],
          'script-src': ["'self'", "'wasm-unsafe-eval'", 'blob:'],
          'script-src-attr': ["'none'"],
          'style-src': ["'self'", "'unsafe-inline'"],
          'worker-src': ["'self'", 'blob:'],
          'connect-src': ["'self'", 'https://cdn.jsdelivr.net'],
        },
      },
    }),
  );

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

  // Production single-server hosting: serve the built client when it exists.
  if (clientBuilt) app.use(express.static(clientDist));

  if (!clientBuilt) {
    app.get('/', (_req, res) => sendSuccess(res, { name: 'SolarMitra API', docs: '/api/health' }));
  }
  app.use('/api', router);

  if (clientBuilt) {
    // SPA fallback: client-side routes (/consumer, /admin/login, …) serve index.html.
    // /api/* is passed through so API errors keep their JSON shape.
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
