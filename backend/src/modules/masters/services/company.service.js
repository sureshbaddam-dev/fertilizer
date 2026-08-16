import { Company } from '../models/company.model.js';
import { AppError } from '../../../utils/appError.js';
import { HTTP_STATUS } from '../../../common/httpStatuses.js';

export const companyService = {
  async getAllCompanies(query = {}, userId) {
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
    const companies = await Company.find(filter).sort(sort).exec();
    const total = await Company.countDocuments(filter);

    return { companies, total };
  },

  async getCompanyById(id, userId) {
    if (!userId) throw new Error('userId is required');
    const company = await Company.findOne({ _id: id, userId }).exec();
    if (!company) {
      throw new AppError('Company not found', HTTP_STATUS.NOT_FOUND);
    }
    return company;
  },

  async createCompany(data, userId) {
    if (!userId) throw new Error('userId is required');
    const nameTrimmed = (data.name || '').trim();
    const existing = await Company.findOne({ userId, name: nameTrimmed }).exec();
    if (existing) {
      throw new AppError(`Company name '${data.name}' already exists.`, HTTP_STATUS.CONFLICT);
    }

    const sanitized = { ...data, userId, name: nameTrimmed };
    Object.keys(sanitized).forEach((key) => {
      if (typeof sanitized[key] === 'string' && sanitized[key].trim() === '') {
        delete sanitized[key];
      }
    });

    return await Company.create(sanitized);
  },

  async updateCompany(id, data, userId) {
    if (!userId) throw new Error('userId is required');
    const company = await Company.findOne({ _id: id, userId }).exec();
    if (!company) {
      throw new AppError('Company not found', HTTP_STATUS.NOT_FOUND);
    }

    if (data.name && data.name.toLowerCase() !== company.name.toLowerCase()) {
      const existing = await Company.findOne({ userId, name: data.name.trim() }).exec();
      if (existing) {
        throw new AppError(`Company name '${data.name}' already exists.`, HTTP_STATUS.CONFLICT);
      }
    }

    const cleanData = { ...data };
    delete cleanData.userId;
    delete cleanData._id;

    return await Company.findOneAndUpdate({ _id: id, userId }, { $set: cleanData }, { new: true }).exec();
  },

  async deactivateCompany(id, userId) {
    if (!userId) throw new Error('userId is required');
    const company = await Company.findOneAndUpdate({ _id: id, userId }, { isActive: false }, { new: true }).exec();
    if (!company) throw new AppError('Company not found', HTTP_STATUS.NOT_FOUND);
    return company;
  },

  async restoreCompany(id, userId) {
    if (!userId) throw new Error('userId is required');
    const company = await Company.findOneAndUpdate({ _id: id, userId }, { isActive: true }, { new: true }).exec();
    if (!company) throw new AppError('Company not found', HTTP_STATUS.NOT_FOUND);
    return company;
  },
};
