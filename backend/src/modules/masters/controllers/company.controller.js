import { asyncHandler } from '../../../utils/asyncHandler.js';
import { sendSuccess } from '../../../common/apiResponse.js';
import { HTTP_STATUS } from '../../../common/httpStatuses.js';
import { companyService } from '../services/company.service.js';

export const getCompanies = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const data = await companyService.getAllCompanies(req.query, userId);
  return sendSuccess(res, 'Companies fetched successfully', data, HTTP_STATUS.OK);
});

export const getCompanyById = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const company = await companyService.getCompanyById(req.params.id, userId);
  return sendSuccess(res, 'Company details fetched successfully', { company }, HTTP_STATUS.OK);
});

export const createCompany = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const company = await companyService.createCompany(req.body, userId);
  return sendSuccess(res, 'Company created successfully', { company }, HTTP_STATUS.CREATED);
});

export const updateCompany = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const company = await companyService.updateCompany(req.params.id, req.body, userId);
  return sendSuccess(res, 'Company updated successfully', { company }, HTTP_STATUS.OK);
});

export const deactivateCompany = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const company = await companyService.deactivateCompany(req.params.id, userId);
  return sendSuccess(res, 'Company archived/deactivated successfully', { company }, HTTP_STATUS.OK);
});

export const restoreCompany = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const company = await companyService.restoreCompany(req.params.id, userId);
  return sendSuccess(res, 'Company restored/activated successfully', { company }, HTTP_STATUS.OK);
});
