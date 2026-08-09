import { apiClient } from './apiClient';

export const dashboardService = {
  async getDashboardSummary() {
    return await apiClient.get('/dashboard/summary');
  },
  async getNotifications() {
    return await apiClient.get('/dashboard/notifications');
  },
};
