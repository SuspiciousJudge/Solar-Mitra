import rateLimit from 'express-rate-limit';

const message = { success: false, message: 'Too many requests. Please wait a moment and try again.' };

export const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 600, standardHeaders: 'draft-7', legacyHeaders: false, message });

export const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false, message });
