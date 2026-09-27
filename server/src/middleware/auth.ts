import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { verifyToken, type TokenPayload } from '../services/authService';
import type { UserRole } from '../types';
import { AppError } from '../utils/AppError';

declare module 'express-serve-static-core' {
  interface Request {
    auth?: TokenPayload;
  }
}

export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization ?? '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return next(new AppError(401, 'Please sign in to continue'));
  try {
    req.auth = verifyToken(token);
    return next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) return next(new AppError(401, 'Your session has expired. Please sign in again.'));
    return next(new AppError(401, 'Invalid session. Please sign in again.'));
  }
};

export const requireRole =
  (...roles: UserRole[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.auth || !roles.includes(req.auth.role)) return next(new AppError(403, 'You do not have access to this resource'));
    return next();
  };

export const requireOperator: RequestHandler[] = [requireAuth, requireRole('admin', 'agent')];
