import { reportsService } from '../services/reports.service.js';
import { sendSuccess } from '../../../common/apiResponse.js';
import { HTTP_STATUS } from '../../../common/httpStatuses.js';
import { catchAsync } from '../../../utils/catchAsync.js';

export const reportsController = {
  getBIAnalytics: catchAsync(async (req, res) => {
    const analytics = await reportsService.getBIAnalytics(req.query);
    return sendSuccess(res, 'BI Analytics data retrieved successfully', analytics, HTTP_STATUS.OK);
  }),
};
