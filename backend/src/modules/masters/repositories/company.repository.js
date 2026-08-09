import { Company } from '../models/company.model.js';
import { createBaseMasterRepository } from '../../../common/baseMaster.repository.js';
import { logger } from '../../../config/logger.config.js';

const baseRepo = createBaseMasterRepository(Company);

export const companyRepository = {
  ...baseRepo,

  async findByName(name) {
    logger.info(`🗄️ [Mongo Query] Company.findOne({ name: /^${name}$/i })`);
    return await Company.findOne({ name: new RegExp(`^${name}$`, 'i') }).exec();
  },

  async create(data) {
    logger.info(`🗄️ [Mongo Query] Company.create(payload):\n${JSON.stringify(data, null, 2)}`);
    const doc = await Company.create(data);
    logger.info(`🗄️ [Mongo Result] Document Created -> ID: ${doc._id}`);
    return doc;
  },
};
