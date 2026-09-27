import type { AnalyticsOverview, MonthlyPoint, RegionalPoint } from '@/types';
import { api, unwrap } from './api';

export const fetchOverview = () => unwrap<AnalyticsOverview>(api.get('/analytics/overview'));
export const fetchMonthly = () => unwrap<MonthlyPoint[]>(api.get('/analytics/monthly'));
export const fetchRegional = () => unwrap<RegionalPoint[]>(api.get('/analytics/regional'));
