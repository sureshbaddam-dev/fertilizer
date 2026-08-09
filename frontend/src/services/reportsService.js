import { apiClient } from './apiClient';

export const reportsService = {
  getBIAnalytics: async (params = {}) => {
    return await apiClient.get('/reports/bi-analytics', { params });
  },
};
