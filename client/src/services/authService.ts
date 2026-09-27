import type { AuthUser } from '@/types';
import { api, unwrap } from './api';

export const login = (email: string, password: string) =>
  unwrap<{ token: string; user: AuthUser }>(api.post('/auth/login', { email, password }));

export const fetchMe = () => unwrap<AuthUser>(api.get('/auth/me'));
