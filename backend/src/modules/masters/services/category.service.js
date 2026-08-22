import { Category } from '../models/category.model.js';
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
  async getAllCategories(query = {}, userId) {
    if (!userId) throw new Error('userId is required');
    const filter = { userId };
    if (query.search) {
      filter.name = { $regex: query.search, $options: 'i' };
    }
    if (query.isActive !== undefined) {
      filter.isActive = query.isActive === 'true' || query.isActive === true;
    }

    const sort = { name: 1 };
    const categories = await Category.find(filter).sort(sort).lean().exec();

    // Case-insensitive deduplication by category name
    const uniqueMap = new Map();
    categories.forEach((cat) => {
      const key = (cat.name || '').trim().toLowerCase();
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, cat);
      }
    });

    const uniqueCategories = Array.from(uniqueMap.values());
    return { categories: uniqueCategories, total: uniqueCategories.length };
  },

  async getCategoryById(id, userId) {
    if (!userId) throw new Error('userId is required');
    const category = await Category.findOne({ _id: id, userId }).exec();
    if (!category) {
      throw new AppError('Category not found', HTTP_STATUS.NOT_FOUND);
    }
    return category;
  },

  async createCategory(data, userId) {
    if (!userId) throw new Error('userId is required');
    const rawName = (data.name || '').trim();
    const existing = await Category.findOne({
      userId,
      name: { $regex: `^${rawName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
    }).exec();

    if (existing) {
      throw new AppError(`Category with name '${data.name}' already exists`, HTTP_STATUS.CONFLICT);
    }

    const slug = slugify(data.name);
    return await Category.create({ ...data, userId, name: rawName, slug });
  },

  async updateCategory(id, data, userId) {
    if (!userId) throw new Error('userId is required');
    const category = await Category.findOne({ _id: id, userId }).exec();
    if (!category) {
      throw new AppError('Category not found', HTTP_STATUS.NOT_FOUND);
    }

    if (data.name && data.name.toLowerCase() !== category.name.toLowerCase()) {
      const existing = await Category.findOne({ userId, name: data.name.trim() }).exec();
      if (existing) {
        throw new AppError(`Category with name '${data.name}' already exists`, HTTP_STATUS.CONFLICT);
      }
      data.slug = slugify(data.name);
    }

    const cleanData = { ...data };
    delete cleanData.userId;
    delete cleanData._id;

    return await Category.findOneAndUpdate({ _id: id, userId }, { $set: cleanData }, { new: true }).exec();
  },

  async deactivateCategory(id, userId) {
    if (!userId) throw new Error('userId is required');
    const category = await Category.findOneAndUpdate({ _id: id, userId }, { isActive: false }, { new: true }).exec();
    if (!category) throw new AppError('Category not found', HTTP_STATUS.NOT_FOUND);
    return category;
  },

  async restoreCategory(id, userId) {
    if (!userId) throw new Error('userId is required');
    const category = await Category.findOneAndUpdate({ _id: id, userId }, { isActive: true }, { new: true }).exec();
    if (!category) throw new AppError('Category not found', HTTP_STATUS.NOT_FOUND);
    return category;
  },
};
