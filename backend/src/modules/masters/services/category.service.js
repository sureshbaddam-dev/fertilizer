import { categoryRepository } from '../repositories/category.repository.js';
import { baseMasterService } from '../../../common/baseMaster.service.js';
import { AppError } from '../../../utils/appError.js';
import { HTTP_STATUS } from '../../../common/httpStatuses.js';

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

export const categoryService = {
  async getAllCategories(query = {}) {
    const filter = {};
    if (query.search) {
      filter.name = { $regex: query.search, $options: 'i' };
    }
    if (query.isActive !== undefined) {
      filter.isActive = query.isActive === 'true';
    }

    const sort = { name: 1 };
    const categories = await categoryRepository.findAll(filter, { sort });
    const total = await categoryRepository.count(filter);

    return { categories, total };
  },

  async getCategoryById(id) {
    const category = await categoryRepository.findById(id);
    if (!category) {
      throw new AppError('Category not found', HTTP_STATUS.NOT_FOUND);
    }
    return category;
  },

  async createCategory(data) {
    const existing = await categoryRepository.findByName(data.name);
    if (existing) {
      throw new AppError(`Category with name '${data.name}' already exists`, HTTP_STATUS.CONFLICT);
    }

    const slug = slugify(data.name);
    return await categoryRepository.create({ ...data, slug });
  },

  async updateCategory(id, data) {
    const category = await categoryRepository.findById(id);
    if (!category) {
      throw new AppError('Category not found', HTTP_STATUS.NOT_FOUND);
    }

    if (data.name && data.name.toLowerCase() !== category.name.toLowerCase()) {
      const existing = await categoryRepository.findByName(data.name);
      if (existing) {
        throw new AppError(`Category with name '${data.name}' already exists`, HTTP_STATUS.CONFLICT);
      }
      data.slug = slugify(data.name);
    }

    return await categoryRepository.update(id, data);
  },

  async deactivateCategory(id) {
    return await baseMasterService.deactivateMaster(categoryRepository, id, 'Category');
  },

  async restoreCategory(id) {
    return await baseMasterService.restoreMaster(categoryRepository, id, 'Category');
  },

  async toggleCategoryStatus(id) {
    return await baseMasterService.toggleMasterStatus(categoryRepository, id, 'Category');
  },
};
