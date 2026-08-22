import { Unit } from '../models/unit.model.js';
import { AppError } from '../../../utils/appError.js';
import { HTTP_STATUS } from '../../../common/httpStatuses.js';

export const unitService = {
  async getAllUnits(query = {}, userId) {
    if (!userId) throw new Error('userId is required');
    const filter = { userId };
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
    const units = await Unit.find(filter).sort(sort).lean().exec();
    const total = await Unit.countDocuments(filter);

    return { units, total };
  },

  async getUnitById(id, userId) {
    if (!userId) throw new Error('userId is required');
    const unit = await Unit.findOne({ _id: id, userId }).exec();
    if (!unit) {
      throw new AppError('Unit not found', HTTP_STATUS.NOT_FOUND);
    }
    return unit;
  },

  async createUnit(data, userId) {
    if (!userId) throw new Error('userId is required');
    const nameTrimmed = (data.name || '').trim();
    const existing = await Unit.findOne({ userId, name: nameTrimmed }).exec();
    if (existing) {
      throw new AppError(`Unit with name '${data.name}' already exists`, HTTP_STATUS.CONFLICT);
    }
    return await Unit.create({ ...data, userId, name: nameTrimmed });
  },

  async updateUnit(id, data, userId) {
    if (!userId) throw new Error('userId is required');
    const unit = await Unit.findOne({ _id: id, userId }).exec();
    if (!unit) {
      throw new AppError('Unit not found', HTTP_STATUS.NOT_FOUND);
    }

    if (data.name && data.name.toLowerCase() !== unit.name.toLowerCase()) {
      const existing = await Unit.findOne({ userId, name: data.name.trim() }).exec();
      if (existing) {
        throw new AppError(`Unit with name '${data.name}' already exists`, HTTP_STATUS.CONFLICT);
      }
    }

    const cleanData = { ...data };
    delete cleanData.userId;
    delete cleanData._id;

    return await Unit.findOneAndUpdate({ _id: id, userId }, { $set: cleanData }, { new: true }).exec();
  },

  async deactivateUnit(id, userId) {
    if (!userId) throw new Error('userId is required');
    const unit = await Unit.findOneAndUpdate({ _id: id, userId }, { isActive: false }, { new: true }).exec();
    if (!unit) throw new AppError('Unit not found', HTTP_STATUS.NOT_FOUND);
    return unit;
  },

  async restoreUnit(id, userId) {
    if (!userId) throw new Error('userId is required');
    const unit = await Unit.findOneAndUpdate({ _id: id, userId }, { isActive: true }, { new: true }).exec();
    if (!unit) throw new AppError('Unit not found', HTTP_STATUS.NOT_FOUND);
    return unit;
  },
};
