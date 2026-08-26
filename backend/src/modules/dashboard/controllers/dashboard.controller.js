import { dashboardService } from '../services/dashboard.service.js';
import { sendSuccess } from '../../../common/apiResponse.js';
import { HTTP_STATUS } from '../../../common/httpStatuses.js';

export const dashboardController = {
  async getDashboardSummary(req, res, next) {
    try {
      const userId = req.user._id;
      const summary = await dashboardService.getDashboardSummary(userId);
      return sendSuccess(res, 'Dashboard summary retrieved successfully', summary, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  },
  async getDashboardOverview(req, res, next) {
    try {
      const userId = req.user._id;
      const overview = await dashboardService.getDashboardOverview(userId);
      return sendSuccess(res, 'Dashboard overview retrieved successfully', overview, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  },
  async getNotifications(req, res, next) {
    try {
      const userId = req.user._id;
      const notifications = await dashboardService.getNotifications(userId);
      return sendSuccess(res, 'Notifications retrieved successfully', notifications, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  },
};
