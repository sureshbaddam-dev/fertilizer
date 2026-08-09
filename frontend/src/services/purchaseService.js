import { apiClient } from './apiClient';

export const purchaseService = {
  async getPurchases(params = {}) {
    return await apiClient.get('/purchases', { params });
  },

  async getPurchaseById(id) {
    return await apiClient.get(`/purchases/${id}`);
  },

  async createPurchase(data) {
    console.log('----------------------------------------');
    console.log('🚀 DISPATCHING PURCHASE SAVE REQUEST');
    console.log('URL: POST /api/v1/purchases');
    console.log('Payload:', JSON.stringify(data, null, 2));
    console.log('----------------------------------------');
    try {
      const res = await apiClient.post('/purchases', data);
      console.log('✅ PURCHASE SAVED SUCCESSFULLY:', res);
      return res;
    } catch (err) {
      console.error('❌ PURCHASE SAVE ERROR:', err);
      throw err;
    }
  },

  async deletePurchase(id, confirmation = 'DELETE') {
    console.log('----------------------------------------');
    console.log('🚀 DISPATCHING PURCHASE DELETE REQUEST');
    console.log(`URL: DELETE /api/v1/purchases/${id}?confirmation=${encodeURIComponent(confirmation)}`);
    console.log('----------------------------------------');
    try {
      const res = await apiClient.delete(`/purchases/${id}?confirmation=${encodeURIComponent(confirmation)}`, {
        data: { confirmation },
      });
      console.log('✅ PURCHASE DELETED SUCCESSFULLY:', res);
      return res;
    } catch (err) {
      console.error('❌ PURCHASE DELETE ERROR:', err);
      throw err;
    }
  },

  async restorePurchase(id) {
    return await apiClient.post(`/purchases/${id}/restore`);
  },

  async getDeletedPurchases(params = {}) {
    return await apiClient.get('/purchases/deleted', { params });
  },
};
