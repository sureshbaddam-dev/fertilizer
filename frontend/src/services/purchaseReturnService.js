import { apiClient } from './apiClient';

export const purchaseReturnService = {
  getPurchaseHistory: async (productId) => {
    return await apiClient.get('/purchases/supplier-return/purchase-history', {
      params: { productId },
    });
  },

  processReturn: async (returnData) => {
    return await apiClient.post('/purchases/supplier-return', returnData);
  },

  getAllReturns: async () => {
    return await apiClient.get('/purchases/supplier-return');
  },
};
