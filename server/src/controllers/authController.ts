import type { Request, Response } from 'express';
import { login, toPublicUser } from '../services/authService';
import { getStore } from '../services/dataStore';
import { AppError } from '../utils/AppError';
import { sendSuccess } from '../utils/apiResponse';

export async function postLogin(req: Request, res: Response) {
  const { email, password } = req.body as { email: string; password: string };
  sendSuccess(res, await login(email, password));
}

export async function getMe(req: Request, res: Response) {
  const user = req.auth ? await getStore().findUserById(req.auth.sub) : null;
  if (!user) throw new AppError(401, 'Your session is no longer valid. Please sign in again.');
  sendSuccess(res, toPublicUser(user));
}
