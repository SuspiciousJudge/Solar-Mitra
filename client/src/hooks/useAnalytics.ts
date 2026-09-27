import { fetchMonthly, fetchOverview, fetchRegional } from '@/services/analyticsService';
import type { AnalyticsOverview, MonthlyPoint, RegionalPoint } from '@/types';
import { useAsync } from './useAsync';

export interface AnalyticsBundle {
  overview: AnalyticsOverview;
  monthly: MonthlyPoint[];
  regional: RegionalPoint[];
}

export function useAnalytics() {
  return useAsync<AnalyticsBundle>(async () => {
    const [overview, monthly, regional] = await Promise.all([fetchOverview(), fetchMonthly(), fetchRegional()]);
    return { overview, monthly, regional };
  }, []);
}
