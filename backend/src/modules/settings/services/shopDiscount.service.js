import { ShopDiscount } from '../models/shopDiscount.model.js';
import { logger } from '../../../config/logger.config.js';

export const shopDiscountService = {
  async getShopDiscount(userId) {
    if (!userId) throw new Error('userId is required');
    let discount = await ShopDiscount.findOne({ userId }).exec();
    if (!discount) {
      discount = await ShopDiscount.create({
        userId,
        discountType: 'percentage',
        discountValue: 0,
        isEnabled: false,
        notes: '',
      });
      logger.info(`Created default shop discount settings document for user ${userId}`);
    }
    return discount;
  },

  async updateShopDiscount(userId, data) {
    if (!userId) throw new Error('userId is required');
    const cleanData = { ...data };
    delete cleanData.userId;
    delete cleanData._id;

    let discount = await ShopDiscount.findOneAndUpdate(
      { userId },
      { $set: cleanData },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).exec();

    logger.info(`Updated user-scoped shop discount settings for user ${userId}`);
    return discount;
  },
};
