import { asyncHandler } from '../../../utils/asyncHandler.js';
import { sendSuccess } from '../../../common/apiResponse.js';
import { HTTP_STATUS } from '../../../common/httpStatuses.js';
import { categoryService } from '../services/category.service.js';

export const getCategories = asyncHandler(async (req, res) => {
  const data = await categoryService.getAllCategories(req.query);
  return sendSuccess(res, 'Categories fetched successfully', data, HTTP_STATUS.OK);
});

export const getCategoryById = asyncHandler(async (req, res) => {
  const category = await categoryService.getCategoryById(req.params.id);
  return sendSuccess(res, 'Category details fetched successfully', { category }, HTTP_STATUS.OK);
});

export const createCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.createCategory(req.body);
  return sendSuccess(res, 'Category created successfully', { category }, HTTP_STATUS.CREATED);
});

export const updateCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.updateCategory(req.params.id, req.body);
  return sendSuccess(res, 'Category updated successfully', { category }, HTTP_STATUS.OK);
});

export const deactivateCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.deactivateCategory(req.params.id);
  return sendSuccess(res, 'Category archived/deactivated successfully', { category }, HTTP_STATUS.OK);
});

export const restoreCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.restoreCategory(req.params.id);
  return sendSuccess(res, 'Category restored/activated successfully', { category }, HTTP_STATUS.OK);
});
