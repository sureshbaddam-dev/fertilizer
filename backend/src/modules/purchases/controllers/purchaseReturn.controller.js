import { purchaseReturnService } from '../services/purchaseReturn.service.js';
import { sendSuccess } from '../../../common/apiResponse.js';
import { HTTP_STATUS } from '../../../common/httpStatuses.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';

export const purchaseReturnController = {
  getPurchaseHistoryForReturn: asyncHandler(async (req, res) => {
    const { productId } = req.query;
    const userId = req.user?._id;
    const history = await purchaseReturnService.getPurchaseHistoryForReturn(productId, userId);
    return sendSuccess(res, 'Supplier purchase history fetched successfully', history, HTTP_STATUS.OK);
  }),

  processSupplierReturn: asyncHandler(async (req, res) => {
    const userId = req.user?._id || req.body?.userId;
    const result = await purchaseReturnService.processSupplierReturn({ ...req.body, userId }, userId);
    return sendSuccess(res, 'Supplier stock return processed successfully', result, HTTP_STATUS.CREATED);
  }),

  getAllReturns: asyncHandler(async (req, res) => {
    const userId = req.user?._id;
    const returns = await purchaseReturnService.getAllReturns(userId);
    return sendSuccess(res, 'Supplier returns retrieved successfully', returns, HTTP_STATUS.OK);
  }),
};

