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

  getReturnById: asyncHandler(async (req, res) => {
    const userId = req.user?._id;
    const returnDoc = await purchaseReturnService.getReturnById(req.params.id, userId);
    return sendSuccess(res, 'Purchase return details retrieved successfully', returnDoc, HTTP_STATUS.OK);
  }),

  updateSupplierReturn: asyncHandler(async (req, res) => {
    const userId = req.user?._id;
    const result = await purchaseReturnService.updateSupplierReturn(req.params.id, req.body, userId);
    return sendSuccess(res, result.message, result, HTTP_STATUS.OK);
  }),

  recordSupplierRefund: asyncHandler(async (req, res) => {
    const userId = req.user?._id;
    const result = await purchaseReturnService.recordSupplierRefund(req.params.id, req.body, userId);
    return sendSuccess(res, result.message, result, HTTP_STATUS.OK);
  }),
};

