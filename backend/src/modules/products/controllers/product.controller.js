import { asyncHandler } from '../../../utils/asyncHandler.js';
import { sendSuccess } from '../../../common/apiResponse.js';
import { HTTP_STATUS } from '../../../common/httpStatuses.js';
import { productService } from '../services/product.service.js';
import { cloudinaryProductImageService } from '../services/cloudinaryProductImage.service.js';
import { logger } from '../../../config/logger.config.js';

export const getProducts = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;
    const data = await productService.getAllProducts(req.query, userId);
    return sendSuccess(res, 'Products fetched successfully', data, HTTP_STATUS.OK);
  } catch (err) {
    logger.error({ err }, 'Error in getProducts controller');
    throw err;
  }
});

export const getTopSellingProducts = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;
    const data = await productService.getTopSellingProducts(req.query, userId);
    return sendSuccess(res, 'Top selling products fetched successfully', data, HTTP_STATUS.OK);
  } catch (err) {
    logger.error({ err }, 'Error in getTopSellingProducts controller');
    throw err;
  }
});

export const getProductById = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;
    const data = await productService.getProductById(req.params.id, userId);
    return sendSuccess(res, 'Product details fetched successfully', data, HTTP_STATUS.OK);
  } catch (err) {
    logger.error({ err }, 'Error in getProductById controller');
    throw err;
  }
});

export const createProduct = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;
    const product = await productService.createProduct(req.body, userId);
    return sendSuccess(res, 'Product created successfully', { product }, HTTP_STATUS.CREATED);
  } catch (err) {
    logger.error({ err }, 'Error in createProduct controller');
    throw err;
  }
});

export const updateProduct = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;
    const product = await productService.updateProduct(req.params.id, req.body, userId);
    return sendSuccess(res, 'Product updated successfully', { product }, HTTP_STATUS.OK);
  } catch (err) {
    logger.error({ err }, 'Error in updateProduct controller');
    throw err;
  }
});

export const deactivateProduct = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const product = await productService.deactivateProduct(req.params.id, userId);
  return sendSuccess(res, 'Product deleted successfully', { product }, HTTP_STATUS.OK);
});

export const restoreProduct = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const product = await productService.restoreProduct(req.params.id, userId);
  return sendSuccess(res, 'Product restored successfully', { product }, HTTP_STATUS.OK);
});

export const uploadProductImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'No image file uploaded',
    });
  }
  const imageUrl = req.file.path || req.file.secure_url || req.file.url || `/uploads/products/${req.file.filename}`;
  const cloudinaryPublicId = req.file.filename || req.file.public_id || req.file.originalname || imageUrl;

  const searchableName = req.body.searchableName || req.body.productName || req.file.originalname?.replace(/\.[^/.]+$/, '') || 'Product Image';
  const brand = req.body.brand || '';
  const category = req.body.category || '';
  const unit = req.body.unit || '';
  const sha256 = req.file.sha256 || '';

  // Enrich uploaded Cloudinary asset context metadata
  try {
    await cloudinaryProductImageService.registerImage({
      imageUrl,
      cloudinaryPublicId,
      searchableName,
      brand,
      category,
      unit,
      sha256,
      originalFileName: req.file.originalname || '',
      userId: req.user._id,
    });
  } catch (err) {
    logger.warn({ err }, 'Could not enrich Cloudinary asset context metadata');
  }

  return sendSuccess(res, 'Product image uploaded successfully', { imageUrl, cloudinaryPublicId, sha256 }, HTTP_STATUS.OK);
});

export const searchCloudinaryProductImages = asyncHandler(async (req, res) => {
  const data = await cloudinaryProductImageService.searchLibrary(req.query);
  return sendSuccess(res, 'Cloudinary product images fetched successfully', data, HTTP_STATUS.OK);
});

export const getProductHistory = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const data = await productService.getProductHistory(req.params.id, userId);
  return sendSuccess(res, 'Product history fetched successfully', data, HTTP_STATUS.OK);
});

export const updateBatch = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const data = await productService.updateBatch(req.params.batchId, req.body, userId);
  return sendSuccess(res, 'Product batch pricing updated successfully', data, HTTP_STATUS.OK);
});

export const recordDamagedStock = asyncHandler(async (req, res) => {
  const userId = req.user?._id || req.body?.userId;
  const result = await productService.recordDamagedStock(req.body, userId);
  return sendSuccess(res, 'Damaged stock recorded and written off successfully', result, HTTP_STATUS.CREATED);
});

export const getStockAdjustments = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const data = await productService.getStockAdjustments(req.query, userId);
  return sendSuccess(res, 'Stock adjustments retrieved successfully', data, HTTP_STATUS.OK);
});

export const addOpeningStock = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const result = await productService.addOpeningStock(req.body, userId);
  return sendSuccess(res, 'Opening stock added successfully', result, HTTP_STATUS.CREATED);
});

export const getOpeningStockList = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const data = await productService.getOpeningStockList(req.query, userId);
  return sendSuccess(res, 'Opening stocks fetched successfully', data, HTTP_STATUS.OK);
});

export const updateOpeningStock = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const result = await productService.updateOpeningStock(req.params.id, req.body, userId);
  return sendSuccess(res, 'Opening stock updated successfully', result, HTTP_STATUS.OK);
});

export const deleteOpeningStock = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const result = await productService.deleteOpeningStock(req.params.id, userId);
  return sendSuccess(res, 'Opening stock deleted successfully', result, HTTP_STATUS.OK);
});
