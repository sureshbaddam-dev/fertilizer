import { companyRepository } from '../repositories/company.repository.js';
import { baseMasterService } from '../../../common/baseMaster.service.js';
import { AppError } from '../../../utils/appError.js';
import { HTTP_STATUS } from '../../../common/httpStatuses.js';
import { logger } from '../../../config/logger.config.js';

export const companyService = {
  async getAllCompanies(query = {}) {
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
    const companies = await companyRepository.findAll(filter, { sort });
    const total = await companyRepository.count(filter);

    return { companies, total };
  },

  async getCompanyById(id) {
    const company = await companyRepository.findById(id);
    if (!company) {
      throw new AppError('Company not found', HTTP_STATUS.NOT_FOUND);
    }
    return company;
  },

  async createCompany(data) {
    logger.info(`⚙️ [Service Started] companyService.createCompany -> Name: '${data.name}'`);

    // 1. Duplicate Check
    logger.info(`🔍 Performing Duplicate Check for Name: '${data.name}'`);
    const existing = await companyRepository.findByName(data.name);
    if (existing) {
      logger.warn(`⚠️ Duplicate Company Found! ID: ${existing._id}, Name: ${existing.name}`);
      throw new AppError(`Company name '${data.name}' already exists.`, HTTP_STATUS.CONFLICT);
    }
    logger.info('✅ Duplicate Check Passed (No existing company found)');

    // 2. Data Sanitization (convert empty string fields to undefined so Mongo doesn't store empty string noise)
    const sanitized = { ...data };
    Object.keys(sanitized).forEach((key) => {
      if (typeof sanitized[key] === 'string' && sanitized[key].trim() === '') {
        delete sanitized[key];
      }
    });

    logger.info(`💾 Sanitized Data Before Save: ${JSON.stringify(sanitized, null, 2)}`);

    // 3. Save via Repository
    const createdCompany = await companyRepository.create(sanitized);
    logger.info(`🎉 [Service Finished] Saved Company ID: ${createdCompany._id}`);
    return createdCompany;
  },

  async updateCompany(id, data) {
    logger.info(`⚙️ [Service Started] companyService.updateCompany -> ID: ${id}`);
    const company = await companyRepository.findById(id);
    if (!company) {
      throw new AppError('Company not found', HTTP_STATUS.NOT_FOUND);
    }

    if (data.name && data.name.toLowerCase() !== company.name.toLowerCase()) {
      const existing = await companyRepository.findByName(data.name);
      if (existing) {
        throw new AppError(`Company name '${data.name}' already exists.`, HTTP_STATUS.CONFLICT);
      }
    }

    const sanitized = { ...data };
    Object.keys(sanitized).forEach((key) => {
      if (typeof sanitized[key] === 'string' && sanitized[key].trim() === '') {
        delete sanitized[key];
      }
    });

    return await companyRepository.update(id, sanitized);
  },

  async deactivateCompany(id) {
    return await baseMasterService.deactivateMaster(companyRepository, id, 'Company');
  },

  async restoreCompany(id) {
    return await baseMasterService.restoreMaster(companyRepository, id, 'Company');
  },

  async toggleCompanyStatus(id) {
    return await baseMasterService.toggleMasterStatus(companyRepository, id, 'Company');
  },
};
