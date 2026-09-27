import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import { sendError } from '../utils/apiResponse';

export const notFoundHandler: RequestHandler = (req, res) => {
  sendError(res, `Route ${req.method} ${req.originalUrl} not found`, 404);
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    // Only the first, human-friendly message — never the raw Zod structure.
    return sendError(res, error.issues[0]?.message ?? 'Please check the information you entered', 400);
  }
  if (error instanceof AppError) return sendError(res, error.message, error.statusCode);
  if (error?.type === 'entity.parse.failed') return sendError(res, 'Request body must be valid JSON', 400);

  if (!env.isTest) console.error('[error]', error);
  return sendError(res, 'Something went wrong', 500);
};
