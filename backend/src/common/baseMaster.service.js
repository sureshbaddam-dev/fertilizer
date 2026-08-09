import { AppError } from '../utils/appError.js';
import { HTTP_STATUS } from './httpStatuses.js';
import { logger } from '../config/logger.config.js';

/**
 * Reusable Base Master Service Utility
 * Standardized status transitions, reference safety checks, and audit logging across all ERP modules.
 */
export const baseMasterService = {
  async deactivateMaster(repository, id, masterName = 'Record', referenceConfigs = []) {
    const record = await repository.findById(id);
    if (!record) {
      throw new AppError(`${masterName} not found`, HTTP_STATUS.NOT_FOUND);
    }

    if (!record.isActive) {
      throw new AppError(`${masterName} is already deactivated`, HTTP_STATUS.BAD_REQUEST);
    }

    // Safety audit: Check if referenced in transactional modules
    const references = await repository.checkReferences(id, referenceConfigs);
    if (references.length > 0) {
      const summary = references.map((r) => `${r.count} in ${r.module}`).join(', ');
      logger.warn(`ℹ️ ${masterName} [${id}] deactivated with active historical references (${summary})`);
    }

    const updated = await repository.softDelete(id);
    logger.info(`🔒 Master Deactivated: ${masterName} [${id}] -> isActive: false`);
    return updated;
  },

  async restoreMaster(repository, id, masterName = 'Record') {
    const record = await repository.findById(id);
    if (!record) {
      throw new AppError(`${masterName} not found`, HTTP_STATUS.NOT_FOUND);
    }

    if (record.isActive) {
      throw new AppError(`${masterName} is already active`, HTTP_STATUS.BAD_REQUEST);
    }

    const updated = await repository.restore(id);
    logger.info(`🔓 Master Restored: ${masterName} [${id}] -> isActive: true`);
    return updated;
  },

  async toggleMasterStatus(repository, id, masterName = 'Record', referenceConfigs = []) {
    const record = await repository.findById(id);
    if (!record) {
      throw new AppError(`${masterName} not found`, HTTP_STATUS.NOT_FOUND);
    }

    if (record.isActive) {
      return await this.deactivateMaster(repository, id, masterName, referenceConfigs);
    } else {
      return await this.restoreMaster(repository, id, masterName);
    }
  },
};
