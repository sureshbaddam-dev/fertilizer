import { Category } from '../models/category.model.js';
import { createBaseMasterRepository } from '../../../common/baseMaster.repository.js';

const baseRepo = createBaseMasterRepository(Category);

export const categoryRepository = {
  ...baseRepo,

  async findByName(name, userId = null) {
    const filter = userId ? { userId, name: new RegExp(`^${name}$`, 'i') } : { name: new RegExp(`^${name}$`, 'i') };
    return await Category.findOne(filter).exec();
  },

  async findBySlug(slug, userId = null) {
    const filter = userId ? { userId, slug } : { slug };
    return await Category.findOne(filter).exec();
  },
};
