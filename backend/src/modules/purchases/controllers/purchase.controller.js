import { asyncHandler } from '../../../utils/asyncHandler.js';
import { sendSuccess } from '../../../common/apiResponse.js';
import { HTTP_STATUS } from '../../../common/httpStatuses.js';
import { purchaseService } from '../services/purchase.service.js';

export const getPurchases = asyncHandler(async (req, res) => {
  const data = await purchaseService.getAllPurchases(req.query);
  return sendSuccess(res, 'Purchase history fetched successfully', data, HTTP_STATUS.OK);
});

export const getPurchaseById = asyncHandler(async (req, res) => {
  const data = await purchaseService.getPurchaseById(req.params.id);
  return sendSuccess(res, 'Purchase details fetched successfully', data, HTTP_STATUS.OK);
});

export const createPurchase = asyncHandler(async (req, res) => {
  const data = await purchaseService.createPurchase(req.body);
  return sendSuccess(res, 'Purchase entry saved successfully and inventory updated', data, HTTP_STATUS.CREATED);
});

export const deletePurchase = asyncHandler(async (req, res) => {
  const confirmation = req.body?.confirmation || req.query?.confirmation || '';
  const result = await purchaseService.softDeletePurchase(req.params.id, req.user || {}, confirmation);
  return sendSuccess(res, result.message, result, HTTP_STATUS.OK);
});

export const restorePurchase = asyncHandler(async (req, res) => {
  const result = await purchaseService.restorePurchase(req.params.id, req.user || {});
  return sendSuccess(res, result.message, result, HTTP_STATUS.OK);
});

export const getDeletedPurchases = asyncHandler(async (req, res) => {
  const data = await purchaseService.getDeletedPurchases(req.query);
  return sendSuccess(res, 'Deleted purchase history fetched successfully', data, HTTP_STATUS.OK);
});
