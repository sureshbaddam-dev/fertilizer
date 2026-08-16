import { asyncHandler } from '../../../utils/asyncHandler.js';
import { sendSuccess } from '../../../common/apiResponse.js';
import { HTTP_STATUS } from '../../../common/httpStatuses.js';
import { supplierService } from '../services/supplier.service.js';

export const getSuppliers = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const data = await supplierService.getAllSuppliers(req.query, userId);
  return sendSuccess(res, 'Suppliers fetched successfully', data, HTTP_STATUS.OK);
});

export const getSupplierById = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const supplier = await supplierService.getSupplierById(req.params.id, userId);
  return sendSuccess(res, 'Supplier details fetched successfully', { supplier }, HTTP_STATUS.OK);
});

export const createSupplier = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const supplier = await supplierService.createSupplier(req.body, userId);
  return sendSuccess(res, 'Supplier created successfully', { supplier }, HTTP_STATUS.CREATED);
});

export const updateSupplier = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const supplier = await supplierService.updateSupplier(req.params.id, req.body, userId);
  return sendSuccess(res, 'Supplier updated successfully', { supplier }, HTTP_STATUS.OK);
});

export const deactivateSupplier = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const supplier = await supplierService.deactivateSupplier(req.params.id, userId);
  return sendSuccess(res, 'Supplier deleted successfully', { supplier }, HTTP_STATUS.OK);
});

export const restoreSupplier = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const supplier = await supplierService.restoreSupplier(req.params.id, userId);
  return sendSuccess(res, 'Supplier restored successfully', { supplier }, HTTP_STATUS.OK);
});

export const getSupplierLedger = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const data = await supplierService.getSupplierLedger(req.params.id, req.query, userId);
  return sendSuccess(res, 'Supplier ledger fetched successfully', data, HTTP_STATUS.OK);
});

export const recordSupplierPayment = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const data = await supplierService.recordSupplierPayment(req.params.id, req.body, userId);
  return sendSuccess(res, 'Supplier payment recorded successfully', data, HTTP_STATUS.CREATED);
});

export const deletePayment = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const confirmation = req.body?.confirmation || req.query?.confirmation || '';
  const result = await supplierService.softDeletePayment(req.params.id, userId, confirmation);
  return sendSuccess(res, result.message, result, HTTP_STATUS.OK);
});

export const restorePayment = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const result = await supplierService.restorePayment(req.params.id, userId);
  return sendSuccess(res, result.message, result, HTTP_STATUS.OK);
});
