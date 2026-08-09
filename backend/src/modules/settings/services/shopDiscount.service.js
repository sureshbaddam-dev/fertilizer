import { ShopDiscount } from '../models/shopDiscount.model.js';
import { logger } from '../../../config/logger.config.js';

export const shopDiscountService = {
  async getShopDiscount() {
    let discount = await ShopDiscount.findOne().exec();
    if (!discount) {
      discount = await ShopDiscount.create({
        discountType: 'percentage',
        discountValue: 5,
        isEnabled: true,
        notes: 'Flat 5% OFF on all purchases',
      });
      logger.info('Created default shop discount settings document');
    }
    return discount;
  },

  async updateShopDiscount(data) {
    let discount = await ShopDiscount.findOne().exec();
    if (!discount) {
      discount = new ShopDiscount(data);
    } else {
      if (data.discountType !== undefined) discount.discountType = data.discountType;
      if (data.discountValue !== undefined) discount.discountValue = Number(data.discountValue);
      if (data.isEnabled !== undefined) discount.isEnabled = Boolean(data.isEnabled);
      if (data.startDate !== undefined) discount.startDate = data.startDate ? new Date(data.startDate) : null;
      if (data.endDate !== undefined) discount.endDate = data.endDate ? new Date(data.endDate) : null;
      if (data.notes !== undefined) discount.notes = String(data.notes).trim();
    }
    await discount.save();
    return discount;
  },
};
