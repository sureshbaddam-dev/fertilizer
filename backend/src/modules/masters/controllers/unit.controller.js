import { asyncHandler } from '../../../utils/asyncHandler.js';
import { sendSuccess } from '../../../common/apiResponse.js';
import { HTTP_STATUS } from '../../../common/httpStatuses.js';
import { unitService } from '../services/unit.service.js';

export const getUnits = asyncHandler(async (req, res) => {
  const data = await unitService.getAllUnits(req.query);
  return sendSuccess(res, 'Units fetched successfully', data, HTTP_STATUS.OK);
});

export const getUnitById = asyncHandler(async (req, res) => {
  const unit = await unitService.getUnitById(req.params.id);
  return sendSuccess(res, 'Unit details fetched successfully', { unit }, HTTP_STATUS.OK);
});

export const createUnit = asyncHandler(async (req, res) => {
  const unit = await unitService.createUnit(req.body);
  return sendSuccess(res, 'Unit created successfully', { unit }, HTTP_STATUS.CREATED);
});

export const updateUnit = asyncHandler(async (req, res) => {
  const unit = await unitService.updateUnit(req.params.id, req.body);
  return sendSuccess(res, 'Unit updated successfully', { unit }, HTTP_STATUS.OK);
});

export const deactivateUnit = asyncHandler(async (req, res) => {
  const unit = await unitService.deactivateUnit(req.params.id);
  return sendSuccess(res, 'Unit archived/deactivated successfully', { unit }, HTTP_STATUS.OK);
});

export const restoreUnit = asyncHandler(async (req, res) => {
  const unit = await unitService.restoreUnit(req.params.id);
  return sendSuccess(res, 'Unit restored/activated successfully', { unit }, HTTP_STATUS.OK);
});
