import { asyncHandler } from '../../../utils/asyncHandler.js';
import { sendSuccess } from '../../../common/apiResponse.js';
import { HTTP_STATUS } from '../../../common/httpStatuses.js';
import { productService } from '../services/product.service.js';
import { logger } from '../../../config/logger.config.js';

export const getProducts = asyncHandler(async (req, res) => {
  try {
    const data = await productService.getAllProducts(req.query);
    return sendSuccess(res, 'Products fetched successfully', data, HTTP_STATUS.OK);
  } catch (err) {
    const debugText =
      `\n====================================================\n` +
      `🚨 GET /api/v1/products FAILED - DIAGNOSTIC DETAILS\n` +
      `----------------------------------------------------\n` +
      `• File          : backend/src/modules/products/controllers/product.controller.js\n` +
      `• Function      : getProducts\n` +
      `• Query Params  : ${JSON.stringify(req.query)}\n` +
      `• Error Name    : ${err.name || 'Error'}\n` +
      `• Error Message : ${err.message}\n` +
      (err.errors ? `• Validation Errors:\n${JSON.stringify(err.errors, null, 2)}\n` : '') +
      `----------------------------------------------------\n` +
      `• Stack Trace:\n${err.stack}\n` +
      `====================================================\n`;

    logger.error(debugText);
    console.error(debugText);
    throw err;
  }
});

export const getTopSellingProducts = asyncHandler(async (req, res) => {
  try {
    const data = await productService.getTopSellingProducts(req.query);
    return sendSuccess(res, 'Top selling products fetched successfully', data, HTTP_STATUS.OK);
  } catch (err) {
    logger.error({ err }, 'Error in getTopSellingProducts controller');
    throw err;
  }
});

export const getProductById = asyncHandler(async (req, res) => {
  try {
    const data = await productService.getProductById(req.params.id);
    return sendSuccess(res, 'Product details fetched successfully', data, HTTP_STATUS.OK);
  } catch (err) {
    const debugText =
      `\n====================================================\n` +
      `🚨 GET /api/v1/products/:id FAILED - DIAGNOSTIC DETAILS\n` +
      `----------------------------------------------------\n` +
      `• File          : backend/src/modules/products/controllers/product.controller.js\n` +
      `• Function      : getProductById\n` +
      `• Product ID    : ${req.params.id}\n` +
      `• Error Name    : ${err.name || 'Error'}\n` +
      `• Error Message : ${err.message}\n` +
      `----------------------------------------------------\n` +
      `• Stack Trace:\n${err.stack}\n` +
      `====================================================\n`;

    logger.error(debugText);
    console.error(debugText);
    throw err;
  }
});

export const createProduct = asyncHandler(async (req, res) => {
  try {
    const product = await productService.createProduct(req.body);
    return sendSuccess(res, 'Product created successfully', { product }, HTTP_STATUS.CREATED);
  } catch (err) {
    const debugText =
      `\n====================================================\n` +
      `🚨 POST /api/v1/products FAILED - DIAGNOSTIC DETAILS\n` +
      `----------------------------------------------------\n` +
      `• File          : backend/src/modules/products/controllers/product.controller.js\n` +
      `• Function      : createProduct\n` +
      `• Request Body  :\n${JSON.stringify(req.body, null, 2)}\n` +
      (req.file ? `• Uploaded Image :\n${JSON.stringify(req.file, null, 2)}\n` : '') +
      `• Error Name    : ${err.name || 'Error'}\n` +
      `• Error Message : ${err.message}\n` +
      (err.errors ? `• Validation Errors:\n${JSON.stringify(err.errors, null, 2)}\n` : '') +
      (err.code ? `• Mongo Error Code: ${err.code}\n` : '') +
      `----------------------------------------------------\n` +
      `• Stack Trace:\n${err.stack}\n` +
      `====================================================\n`;

    logger.error(debugText);
    console.error(debugText);
    throw err;
  }
});

export const updateProduct = asyncHandler(async (req, res) => {
  try {
    const product = await productService.updateProduct(req.params.id, req.body);
    return sendSuccess(res, 'Product updated successfully', { product }, HTTP_STATUS.OK);
  } catch (err) {
    const debugText =
      `\n====================================================\n` +
      `🚨 PUT /api/v1/products/:id FAILED - DIAGNOSTIC DETAILS\n` +
      `----------------------------------------------------\n` +
      `• File          : backend/src/modules/products/controllers/product.controller.js\n` +
      `• Function      : updateProduct\n` +
      `• Product ID    : ${req.params.id}\n` +
      `• Request Body  :\n${JSON.stringify(req.body, null, 2)}\n` +
      `• Error Name    : ${err.name || 'Error'}\n` +
      `• Error Message : ${err.message}\n` +
      `----------------------------------------------------\n` +
      `• Stack Trace:\n${err.stack}\n` +
      `====================================================\n`;

    logger.error(debugText);
    console.error(debugText);
    throw err;
  }
});

export const deactivateProduct = asyncHandler(async (req, res) => {
  const userId = req.user?._id || req.user?.id;
  const product = await productService.deactivateProduct(req.params.id, userId);
  return sendSuccess(res, 'Product deleted successfully', { product }, HTTP_STATUS.OK);
});

export const restoreProduct = asyncHandler(async (req, res) => {
  const product = await productService.restoreProduct(req.params.id);
  return sendSuccess(res, 'Product restored successfully', { product }, HTTP_STATUS.OK);
});

export const uploadProductImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'No image file uploaded',
    });
  }
  const imageUrl = `/uploads/products/${req.file.filename}`;
  return sendSuccess(res, 'Product image uploaded successfully', { imageUrl }, HTTP_STATUS.OK);
});

export const getProductHistory = asyncHandler(async (req, res) => {
  const data = await productService.getProductHistory(req.params.id);
  return sendSuccess(res, 'Product history fetched successfully', data, HTTP_STATUS.OK);
});

export const getProductInventoryDetails = asyncHandler(async (req, res) => {
  const data = await productService.getProductInventoryDetails(req.params.id);
  return sendSuccess(res, 'Product inventory details fetched successfully', data, HTTP_STATUS.OK);
});

export const updateBatch = asyncHandler(async (req, res) => {
  const data = await productService.updateBatch(req.params.batchId, req.body);
  return sendSuccess(res, 'Product batch pricing updated successfully', data, HTTP_STATUS.OK);
});
