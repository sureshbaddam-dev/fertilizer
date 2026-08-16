import { brandService } from '../services/brand.service.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { sendSuccess } from '../../../common/apiResponse.js';
import { HTTP_STATUS } from '../../../common/httpStatuses.js';

export const getBrands = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const result = await brandService.getAllBrands(req.query, userId);
  return sendSuccess(res, 'Brands fetched successfully', result, HTTP_STATUS.OK);
});

export const getBrandById = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const brand = await brandService.getBrandById(req.params.id, userId);
  return sendSuccess(res, 'Brand details fetched successfully', brand, HTTP_STATUS.OK);
});

export const createBrand = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const brand = await brandService.createBrand(req.body, userId);
  return sendSuccess(res, 'Brand created successfully', brand, HTTP_STATUS.CREATED);
});

export const updateBrand = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const brand = await brandService.updateBrand(req.params.id, req.body, userId);
  return sendSuccess(res, 'Brand updated successfully', brand, HTTP_STATUS.OK);
});

export const deactivateBrand = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const brand = await brandService.deactivateBrand(req.params.id, userId);
  return sendSuccess(res, 'Brand deactivated successfully', brand, HTTP_STATUS.OK);
});

export const restoreBrand = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const brand = await brandService.restoreBrand(req.params.id, userId);
  return sendSuccess(res, 'Brand restored successfully', brand, HTTP_STATUS.OK);
});
