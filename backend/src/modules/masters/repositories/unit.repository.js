import { Unit } from '../models/unit.model.js';
import { createBaseMasterRepository } from '../../../common/baseMaster.repository.js';

const baseRepo = createBaseMasterRepository(Unit);

export const unitRepository = {
  ...baseRepo,

  async findByName(name) {
    return await Unit.findOne({ name: new RegExp(`^${name}$`, 'i') }).exec();
  },
};
