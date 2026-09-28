import type {
  AnalyticsOverview,
  FunnelStage,
  MonthlyPoint,
  OperatorFilterState,
  RegionalPoint,
  TransactionSummary,
} from '@/types';
import { toQueryParams } from '@/utils/operatorFilters';
import { api, unwrap } from './api';

/** Every dashboard call takes the same filter object, so KPIs, charts and CSV agree. */
const params = (filters: Partial<OperatorFilterState> = {}) =>
  toQueryParams({ states: [], districts: [], discoms: [], schemes: [], statuses: [], vendors: [], ...filters });

export const fetchOverview = (filters?: Partial<OperatorFilterState>) =>
  unwrap<AnalyticsOverview>(api.get('/analytics/overview', { params: params(filters) }));

export const fetchMonthly = (filters?: Partial<OperatorFilterState>) =>
  unwrap<MonthlyPoint[]>(api.get('/analytics/monthly', { params: params(filters) }));

export const fetchRegional = (filters?: Partial<OperatorFilterState>) =>
  unwrap<RegionalPoint[]>(api.get('/analytics/regional', { params: params(filters) }));

export const fetchFunnel = (filters?: Partial<OperatorFilterState>) =>
  unwrap<FunnelStage[]>(api.get('/analytics/funnel', { params: params(filters) }));

export const fetchMoneyFlow = (filters?: Partial<OperatorFilterState>) =>
  unwrap<TransactionSummary>(api.get('/analytics/money-flow', { params: params(filters) }));
