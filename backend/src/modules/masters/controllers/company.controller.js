import { asyncHandler } from '../../../utils/asyncHandler.js';
import { sendSuccess } from '../../../common/apiResponse.js';
import { HTTP_STATUS } from '../../../common/httpStatuses.js';
import { companyService } from '../services/company.service.js';
import { logger } from '../../../config/logger.config.js';

export const getCompanies = asyncHandler(async (req, res) => {
  const data = await companyService.getAllCompanies(req.query);
  return sendSuccess(res, 'Companies fetched successfully', data, HTTP_STATUS.OK);
});

export const getCompanyById = asyncHandler(async (req, res) => {
  const company = await companyService.getCompanyById(req.params.id);
  return sendSuccess(res, 'Company details fetched successfully', { company }, HTTP_STATUS.OK);
});

export const createCompany = asyncHandler(async (req, res) => {
  logger.info('\n🎬 [Controller Started] createCompany');
  logger.info(`Payload Received in Controller: ${JSON.stringify(req.body, null, 2)}`);

  const company = await companyService.createCompany(req.body);

  logger.info(`🏁 [Controller Finished] createCompany -> ID: ${company._id}`);
  return sendSuccess(res, 'Company created successfully', { company }, HTTP_STATUS.CREATED);
});

export const updateCompany = asyncHandler(async (req, res) => {
  logger.info(`\n🎬 [Controller Started] updateCompany (${req.params.id})`);
  const company = await companyService.updateCompany(req.params.id, req.body);
  logger.info(`🏁 [Controller Finished] updateCompany -> ID: ${company._id}`);
  return sendSuccess(res, 'Company updated successfully', { company }, HTTP_STATUS.OK);
});

export const deactivateCompany = asyncHandler(async (req, res) => {
  const company = await companyService.deactivateCompany(req.params.id);
  return sendSuccess(res, 'Company archived/deactivated successfully', { company }, HTTP_STATUS.OK);
});

export const restoreCompany = asyncHandler(async (req, res) => {
  const company = await companyService.restoreCompany(req.params.id);
  return sendSuccess(res, 'Company restored/activated successfully', { company }, HTTP_STATUS.OK);
});
