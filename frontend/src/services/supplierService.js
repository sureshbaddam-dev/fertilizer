import { apiClient } from './apiClient';

export const supplierService = {
  async getSuppliers(params = {}) {
    return await apiClient.get('/suppliers', { params });
  },

  async getSupplierById(id) {
    return await apiClient.get(`/suppliers/${id}`);
  },

  async createSupplier(data) {
    return await apiClient.post('/suppliers', data);
  },

  async updateSupplier({ id, ...data }) {
    return await apiClient.put(`/suppliers/${id}`, data);
  },

  async getSupplierLedger(id, params = {}) {
    return await apiClient.get(`/suppliers/${id}/ledger`, { params });
  },

  async recordPayment(id, data) {
    return await apiClient.post(`/suppliers/${id}/payments`, data);
  },

  async deactivateSupplier(id) {
    return await apiClient.patch(`/suppliers/${id}/deactivate`);
  },

  async restoreSupplier(id) {
    return await apiClient.patch(`/suppliers/${id}/activate`);
  },

  async deletePayment(id, confirmation = 'DELETE') {
    return await apiClient.delete(`/suppliers/payments/${id}?confirmation=${encodeURIComponent(confirmation)}`, {
      data: { confirmation },
    });
  },

  async restorePayment(id) {
    return await apiClient.post(`/suppliers/payments/${id}/restore`);
  },
};
