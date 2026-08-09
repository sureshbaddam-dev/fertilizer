import { ShopSettings } from '../models/shopSettings.model.js';
import { logger } from '../../../config/logger.config.js';

export const shopSettingsService = {
  async getSettings() {
    let settings = await ShopSettings.findOne().exec();
    if (!settings) {
      settings = await ShopSettings.create({});
      logger.info('Initialized default Shop Settings document in MongoDB');
    }
    return settings;
  },

  async updateSettings(updateData) {
    let settings = await ShopSettings.findOne().exec();
    if (!settings) {
      settings = await ShopSettings.create(updateData);
    } else {
      Object.assign(settings, updateData);
      await settings.save();
    }
    logger.info('Updated Shop Settings in MongoDB');
    return settings;
  },

  async resetSettings() {
    await ShopSettings.deleteMany({}).exec();
    const settings = await ShopSettings.create({});
    logger.info('Reset Shop Settings to system defaults in MongoDB');
    return settings;
  },
};
