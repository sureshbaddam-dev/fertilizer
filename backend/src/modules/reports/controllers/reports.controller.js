import { reportsService } from '../services/reports.service.js';
import { sendSuccess } from '../../../common/apiResponse.js';
import { HTTP_STATUS } from '../../../common/httpStatuses.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';

export const reportsController = {
  getBIAnalytics: asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const analytics = await reportsService.getBIAnalytics(req.query, userId);
    return sendSuccess(res, 'BI Analytics data retrieved successfully', analytics, HTTP_STATUS.OK);
  }),
};

