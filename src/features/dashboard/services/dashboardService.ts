import { apiClient } from '../../../services/api/apiClient';
import { endpoints } from '../../../services/api/endpoints';
import type { DashboardSummary } from '../../../shared/types/api';

export const dashboardService = {
  async summary(month: string) {
    const { data } = await apiClient.get<DashboardSummary>(endpoints.dashboardSummary, { params: { month } });
    return data;
  },
};
