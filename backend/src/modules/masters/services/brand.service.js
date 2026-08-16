import { Brand } from '../models/brand.model.js';
import { Company } from '../models/company.model.js';
import { AppError } from '../../../utils/appError.js';
import { HTTP_STATUS } from '../../../common/httpStatuses.js';
import { logger } from '../../../config/logger.config.js';

export const brandService = {
  async getAllBrands(queryParams = {}, userId) {
    if (!userId) throw new Error('userId is required');
    const filter = { userId };

    if (queryParams.search) {
      filter.name = { $regex: queryParams.search, $options: 'i' };
    }

    if (queryParams.isActive !== undefined) {
      filter.isActive = queryParams.isActive === 'true' || queryParams.isActive === true;
    }

    const brands = await Brand.find(filter).sort({ name: 1 }).lean().exec();
    const companies = await Company.find(filter).sort({ name: 1 }).lean().exec();

    const combinedMap = new Map();
    brands.forEach((b) => combinedMap.set(b._id.toString(), b));
    companies.forEach((c) => {
      if (!combinedMap.has(c._id.toString())) {
        combinedMap.set(c._id.toString(), c);
      }
    });

    const combinedBrands = Array.from(combinedMap.values());
    return { brands: combinedBrands, total: combinedBrands.length };
  },

  async getBrandById(id, userId) {
    if (!userId) throw new Error('userId is required');
    const brand = await Brand.findOne({ _id: id, userId }).exec();
    if (!brand) {
      throw new AppError('Brand not found', HTTP_STATUS.NOT_FOUND);
    }
    return brand;
  },

  async createBrand(brandData, userId) {
    if (!userId) throw new Error('userId is required');
    const existing = await Brand.findOne({
      userId,
      name: { $regex: `^${brandData.name.trim()}$`, $options: 'i' },
    }).exec();

    if (existing) {
      throw new AppError('Brand with this name already exists', HTTP_STATUS.CONFLICT);
    }

    const brand = await Brand.create({ ...brandData, userId });
    logger.info(`Brand created: ${brand.name}`);
    return brand;
  },

  async updateBrand(id, updateData, userId) {
    if (!userId) throw new Error('userId is required');
    const brand = await Brand.findOne({ _id: id, userId }).exec();
    if (!brand) {
      throw new AppError('Brand not found', HTTP_STATUS.NOT_FOUND);
    }

    if (updateData.name && updateData.name.trim().toLowerCase() !== brand.name.toLowerCase()) {
      const existing = await Brand.findOne({
        userId,
        _id: { $ne: id },
        name: { $regex: `^${updateData.name.trim()}$`, $options: 'i' },
      }).exec();

      if (existing) {
        throw new AppError('Another Brand with this name already exists', HTTP_STATUS.CONFLICT);
      }
    }

    const cleanData = { ...updateData };
    delete cleanData.userId;
    delete cleanData._id;

    const updated = await Brand.findOneAndUpdate({ _id: id, userId }, { $set: cleanData }, { new: true }).exec();
    logger.info(`Brand updated: ${updated.name}`);
    return updated;
  },

  async deactivateBrand(id, userId) {
    if (!userId) throw new Error('userId is required');
    const brand = await Brand.findOneAndUpdate({ _id: id, userId }, { isActive: false }, { new: true }).exec();
    if (!brand) {
      throw new AppError('Brand not found', HTTP_STATUS.NOT_FOUND);
    }
    logger.info(`Brand deactivated: ${brand.name}`);
    return brand;
  },

  async restoreBrand(id, userId) {
    if (!userId) throw new Error('userId is required');
    const brand = await Brand.findOneAndUpdate({ _id: id, userId }, { isActive: true }, { new: true }).exec();
    if (!brand) {
      throw new AppError('Brand not found', HTTP_STATUS.NOT_FOUND);
    }
    logger.info(`Brand restored: ${brand.name}`);
    return brand;
  },
};
