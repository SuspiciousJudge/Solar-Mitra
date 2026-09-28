import { useMemo } from 'react';
import { fetchFunnel, fetchMonthly, fetchMoneyFlow, fetchOverview, fetchRegional } from '@/services/analyticsService';
import type { AnalyticsOverview, FunnelStage, MonthlyPoint, OperatorFilterState, RegionalPoint, TransactionSummary } from '@/types';
import { useAsync } from './useAsync';

export interface AnalyticsBundle {
  overview: AnalyticsOverview;
  monthly: MonthlyPoint[];
  regional: RegionalPoint[];
  funnel: FunnelStage[];
  moneyFlow: TransactionSummary;
}

/**
 * One request per analytics endpoint, all sharing the same filter object so the
 * KPI cards, charts and the money-flow table can never disagree.
 */
export function useAnalytics(filters: Partial<OperatorFilterState> = {}) {
  const key = new URLSearchParams(filters as Record<string, string>).toString();
  const query = useMemo(() => filters, [key]);

  const state = useAsync<AnalyticsBundle>(async () => {
    const [overview, monthly, regional, funnel, moneyFlow] = await Promise.all([
      fetchOverview(query),
      fetchMonthly(query),
      fetchRegional(query),
      fetchFunnel(query),
      fetchMoneyFlow(query),
    ]);
    return { overview, monthly, regional, funnel, moneyFlow };
  }, [key]);

  return state;
}
