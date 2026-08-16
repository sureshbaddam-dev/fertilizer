import { ShopSettings } from '../models/shopSettings.model.js';
import { User } from '../../auth/user.model.js';
import { logger } from '../../../config/logger.config.js';

export const shopSettingsService = {
  async getSettings(userId) {
    if (!userId) {
      throw new Error('userId is required to retrieve shop settings');
    }
    let settings = await ShopSettings.findOne({ userId }).exec();
    if (!settings) {
      const user = await User.findById(userId).exec();
      settings = await ShopSettings.create({
        userId,
        ownerName: user?.ownerName || '',
        mobile: user?.mobile || '',
      });
      logger.info(`Initialized user-scoped Shop Settings for user ${userId}`);
    }
    return settings;
  },

  async updateSettings(userId, updateData) {
    if (!userId) {
      throw new Error('userId is required to update shop settings');
    }
    const cleanData = { ...updateData };
    delete cleanData.userId;
    delete cleanData._id;

    const settings = await ShopSettings.findOneAndUpdate(
      { userId },
      { $set: cleanData },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    ).exec();

    logger.info(`Updated user-scoped Shop Settings for user ${userId}`);
    return settings;
  },

  async resetSettings(userId) {
    if (!userId) {
      throw new Error('userId is required to reset shop settings');
    }
    await ShopSettings.deleteOne({ userId }).exec();
    const user = await User.findById(userId).exec();
    const settings = await ShopSettings.create({
      userId,
      ownerName: user?.ownerName || '',
      mobile: user?.mobile || '',
    });
    logger.info(`Reset Shop Settings to default for user ${userId}`);
    return settings;
  },
};
