import { shopSettingsService } from '../services/shopSettings.service.js';
import { sendSuccess } from '../../../common/apiResponse.js';
import { HTTP_STATUS } from '../../../common/httpStatuses.js';

export const shopSettingsController = {
  async getSettings(req, res, next) {
    try {
      const data = await shopSettingsService.getSettings();
      return sendSuccess(res, 'Shop settings retrieved successfully', data, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  },

  async updateSettings(req, res, next) {
    try {
      const data = await shopSettingsService.updateSettings(req.body);
      return sendSuccess(res, 'Shop settings updated successfully', data, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  },

  async resetSettings(req, res, next) {
    try {
      const data = await shopSettingsService.resetSettings();
      return sendSuccess(res, 'Shop settings reset to defaults successfully', data, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  },
};
