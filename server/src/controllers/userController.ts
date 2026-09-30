import type { Request, Response } from 'express';
import { getStore } from '../services/dataStore';
import { ROLE_LABELS } from '../services/statusMachine';
import { sendSuccess } from '../utils/apiResponse';

/** Operator roster — used by the admin reassignment dropdown. */
export async function listUsers(_req: Request, res: Response) {
  const users = await getStore().listUsers();
  sendSuccess(
    res,
    users
      .filter((user) => user.role !== 'consumer' && user.role !== 'provider')
      .map(({ passwordHash: _passwordHash, ...user }) => ({ ...user, roleLabel: ROLE_LABELS[user.role] })),
  );
}
