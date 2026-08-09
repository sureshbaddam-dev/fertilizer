import { Brand } from '../models/brand.model.js';
import { AppError } from '../../../utils/appError.js';
import { HTTP_STATUS } from '../../../common/httpStatuses.js';
import { logger } from '../../../config/logger.config.js';

export const brandService = {
  async getAllBrands(queryParams = {}) {
    const filter = {};

    if (queryParams.search) {
      filter.name = { $regex: queryParams.search, $options: 'i' };
    }

    if (queryParams.isActive !== undefined) {
      filter.isActive = queryParams.isActive === 'true' || queryParams.isActive === true;
    }

    const brands = await Brand.find(filter)
      .sort({ name: 1 })
      .lean()
      .exec();

    return { brands, total: brands.length };
  },

  async getBrandById(id) {
    const brand = await Brand.findById(id).exec();
    if (!brand) {
      throw new AppError('Brand not found', HTTP_STATUS.NOT_FOUND);
    }
    return brand;
  },

  async createBrand(brandData) {
    const existing = await Brand.findOne({
      name: { $regex: `^${brandData.name.trim()}$`, $options: 'i' },
    }).exec();

    if (existing) {
      throw new AppError('Brand with this name already exists', HTTP_STATUS.CONFLICT);
    }

    const brand = await Brand.create(brandData);
    logger.info(`Brand created: ${brand.name}`);
    return brand;
  },

  async updateBrand(id, updateData) {
    const brand = await Brand.findById(id).exec();
    if (!brand) {
      throw new AppError('Brand not found', HTTP_STATUS.NOT_FOUND);
    }

    if (updateData.name && updateData.name.trim().toLowerCase() !== brand.name.toLowerCase()) {
      const existing = await Brand.findOne({
        _id: { $ne: id },
        name: { $regex: `^${updateData.name.trim()}$`, $options: 'i' },
      }).exec();

      if (existing) {
        throw new AppError('Another Brand with this name already exists', HTTP_STATUS.CONFLICT);
      }
    }

    Object.assign(brand, updateData);
    await brand.save();
    logger.info(`Brand updated: ${brand.name}`);
    return brand;
  },

  async deactivateBrand(id) {
    const brand = await Brand.findById(id).exec();
    if (!brand) {
      throw new AppError('Brand not found', HTTP_STATUS.NOT_FOUND);
    }
    brand.isActive = false;
    await brand.save();
    logger.info(`Brand deactivated: ${brand.name}`);
    return brand;
  },

  async restoreBrand(id) {
    const brand = await Brand.findById(id).exec();
    if (!brand) {
      throw new AppError('Brand not found', HTTP_STATUS.NOT_FOUND);
    }
    brand.isActive = true;
    await brand.save();
    logger.info(`Brand restored: ${brand.name}`);
    return brand;
  },
};
