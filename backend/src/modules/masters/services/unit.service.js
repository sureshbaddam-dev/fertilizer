import { unitRepository } from '../repositories/unit.repository.js';
import { baseMasterService } from '../../../common/baseMaster.service.js';
import { AppError } from '../../../utils/appError.js';
import { HTTP_STATUS } from '../../../common/httpStatuses.js';

export const unitService = {
  async getAllUnits(query = {}) {
    const filter = {};
    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { shortName: { $regex: query.search, $options: 'i' } },
      ];
    }
    if (query.isActive !== undefined) {
      filter.isActive = query.isActive === 'true';
    }

    const sort = { name: 1 };
    const units = await unitRepository.findAll(filter, { sort });
    const total = await unitRepository.count(filter);

    return { units, total };
  },

  async getUnitById(id) {
    const unit = await unitRepository.findById(id);
    if (!unit) {
      throw new AppError('Unit not found', HTTP_STATUS.NOT_FOUND);
    }
    return unit;
  },

  async createUnit(data) {
    const existing = await unitRepository.findByName(data.name);
    if (existing) {
      throw new AppError(`Unit with name '${data.name}' already exists`, HTTP_STATUS.CONFLICT);
    }
    return await unitRepository.create(data);
  },

  async updateUnit(id, data) {
    const unit = await unitRepository.findById(id);
    if (!unit) {
      throw new AppError('Unit not found', HTTP_STATUS.NOT_FOUND);
    }

    if (data.name && data.name.toLowerCase() !== unit.name.toLowerCase()) {
      const existing = await unitRepository.findByName(data.name);
      if (existing) {
        throw new AppError(`Unit with name '${data.name}' already exists`, HTTP_STATUS.CONFLICT);
      }
    }

    return await unitRepository.update(id, data);
  },

  async deactivateUnit(id) {
    return await baseMasterService.deactivateMaster(unitRepository, id, 'Unit');
  },

  async restoreUnit(id) {
    return await baseMasterService.restoreMaster(unitRepository, id, 'Unit');
  },

  async toggleUnitStatus(id) {
    return await baseMasterService.toggleMasterStatus(unitRepository, id, 'Unit');
  },
};
