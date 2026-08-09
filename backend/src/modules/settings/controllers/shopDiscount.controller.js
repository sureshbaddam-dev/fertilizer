import { shopDiscountService } from '../services/shopDiscount.service.js';
import { sendSuccess } from '../../../common/apiResponse.js';
import { HTTP_STATUS } from '../../../common/httpStatuses.js';

export const shopDiscountController = {
  async getShopDiscount(req, res, next) {
    try {
      const discount = await shopDiscountService.getShopDiscount();
      return sendSuccess(res, 'Shop discount settings retrieved successfully', discount, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  },

  async updateShopDiscount(req, res, next) {
    try {
      const discount = await shopDiscountService.updateShopDiscount(req.body);
      return sendSuccess(res, 'Shop discount settings updated successfully', discount, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  },
};
