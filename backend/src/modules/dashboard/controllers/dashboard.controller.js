import { dashboardService } from '../services/dashboard.service.js';
import { sendSuccess } from '../../../common/apiResponse.js';
import { HTTP_STATUS } from '../../../common/httpStatuses.js';

export const dashboardController = {
  async getDashboardSummary(req, res, next) {
    try {
      const summary = await dashboardService.getDashboardSummary();
      return sendSuccess(res, 'Dashboard summary retrieved successfully', summary, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  },
  async getNotifications(req, res, next) {
    try {
      const notifications = await dashboardService.getNotifications();
      return sendSuccess(res, 'Notifications retrieved successfully', notifications, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  },
};
