import { localDatabase } from '../../../services/api/localDatabase';

export const dashboardService = {
  async summary(month: string) {
    return localDatabase.dashboardSummary(month);
  },
};
