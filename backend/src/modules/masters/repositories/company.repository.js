import { Company } from '../models/company.model.js';
import { createBaseMasterRepository } from '../../../common/baseMaster.repository.js';
import { logger } from '../../../config/logger.config.js';

const baseRepo = createBaseMasterRepository(Company);

export const companyRepository = {
  ...baseRepo,

  async findByName(name) {
    return await Company.findOne({ name: new RegExp(`^${name}$`, 'i') }).exec();
  },

  async create(data) {
    const doc = await Company.create(data);
    return doc;
  },
};
