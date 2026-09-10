import { apiClient } from './apiClient';

export const purchaseService = {
  async getPurchases(params = {}) {
    return await apiClient.get('/purchases', { params });
  },

  async getPurchaseById(id) {
    return await apiClient.get(`/purchases/${id}`);
  },

  async createPurchase(data) {
    return await apiClient.post('/purchases', data);
  },

  async deletePurchase(id, confirmation = 'DELETE') {
    return await apiClient.delete(`/purchases/${id}?confirmation=${encodeURIComponent(confirmation)}`, {
      data: { confirmation },
    });
  },

  async restorePurchase(id) {
    return await apiClient.post(`/purchases/${id}/restore`);
  },

  async getDeletedPurchases(params = {}) {
    return await apiClient.get('/purchases/deleted', { params });
  },

  async getReturnById(id) {
    return await apiClient.get(`/purchases/supplier-return/${id}`);
  },

  async updateSupplierReturn(id, data) {
    return await apiClient.put(`/purchases/supplier-return/${id}`, data);
  },

  async recordSupplierRefund(id, data) {
    return await apiClient.post(`/purchases/supplier-return/${id}/refund`, data);
  },

  async getPurchaseHistory(productId) {
    return await apiClient.get('/purchases/supplier-return/purchase-history', {
      params: { productId },
    });
  },

  async processReturn(returnData) {
    return await apiClient.post('/purchases/supplier-return', returnData);
  },

  async getAllReturns() {
    return await apiClient.get('/purchases/supplier-return');
  },
};

export const purchaseReturnService = purchaseService;

