import { Category } from '../models/category.model.js';
import { createBaseMasterRepository } from '../../../common/baseMaster.repository.js';

const baseRepo = createBaseMasterRepository(Category);

export const categoryRepository = {
  ...baseRepo,

  async findByName(name) {
    return await Category.findOne({ name: new RegExp(`^${name}$`, 'i') }).exec();
  },

  async findBySlug(slug) {
    return await Category.findOne({ slug }).exec();
  },
};
