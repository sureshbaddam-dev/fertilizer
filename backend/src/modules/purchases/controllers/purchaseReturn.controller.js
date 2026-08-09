import { purchaseReturnService } from '../services/purchaseReturn.service.js';
import { sendSuccess } from '../../../common/apiResponse.js';
import { HTTP_STATUS } from '../../../common/httpStatuses.js';
import { catchAsync } from '../../../utils/catchAsync.js';

export const purchaseReturnController = {
  getPurchaseHistoryForReturn: catchAsync(async (req, res) => {
    const { productId } = req.query;
    const history = await purchaseReturnService.getPurchaseHistoryForReturn(productId);
    return sendSuccess(res, 'Supplier purchase history fetched successfully', history, HTTP_STATUS.OK);
  }),

  processSupplierReturn: catchAsync(async (req, res) => {
    const result = await purchaseReturnService.processSupplierReturn(req.body);
    return sendSuccess(res, 'Supplier stock return processed successfully', result, HTTP_STATUS.CREATED);
  }),

  getAllReturns: catchAsync(async (req, res) => {
    const returns = await purchaseReturnService.getAllReturns();
    return sendSuccess(res, 'Supplier returns retrieved successfully', returns, HTTP_STATUS.OK);
  }),
};
