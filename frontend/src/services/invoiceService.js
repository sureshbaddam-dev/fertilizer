import { apiClient } from './apiClient';

export const invoiceService = {
  async getInvoices(params = {}) {
    return await apiClient.get('/invoices', { params });
  },

  async getInvoiceById(id) {
    return await apiClient.get(`/invoices/${id}`);
  },

  async createInvoice(data) {
    return await apiClient.post('/invoices', data);
  },

  async previewInvoice(data) {
    return await apiClient.post('/invoices/preview', data);
  },

  async deleteInvoice(id) {
    return await apiClient.delete(`/invoices/${id}`);
  },

  async updateInvoice(id, data) {
    return await apiClient.put(`/invoices/${id}`, data);
  },
};
