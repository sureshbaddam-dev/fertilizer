import { shopDiscountService } from '../services/shopDiscount.service.js';
import { sendSuccess } from '../../../common/apiResponse.js';
import { HTTP_STATUS } from '../../../common/httpStatuses.js';

export const shopDiscountController = {
  async getShopDiscount(req, res, next) {
    try {
      const userId = req.user._id;
      const discount = await shopDiscountService.getShopDiscount(userId);
      return sendSuccess(res, 'Shop discount settings retrieved successfully', discount, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  },

  async updateShopDiscount(req, res, next) {
    try {
      const userId = req.user._id;
      const discount = await shopDiscountService.updateShopDiscount(userId, req.body);
      return sendSuccess(res, 'Shop discount settings updated successfully', discount, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  },
};
