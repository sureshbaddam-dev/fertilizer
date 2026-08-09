import { apiClient } from './apiClient';

export const customerService = {
  async getCustomers(params = {}) {
    return await apiClient.get('/customers', { params });
  },

  async getGeneralCustomers(params = {}) {
    return await apiClient.get('/customers/general', { params });
  },

  async getSuggestions() {
    return await apiClient.get('/customers/suggestions');
  },

  async getCustomerById(id) {
    return await apiClient.get(`/customers/${id}`);
  },

  async createCustomer(data) {
    return await apiClient.post('/customers', data);
  },

  async updateCustomer(id, data) {
    return await apiClient.put(`/customers/${id}`, data);
  },

  async deleteCustomer(id) {
    return await apiClient.delete(`/customers/${id}`);
  },

  async recordPayment(id, paymentData) {
    return await apiClient.post(`/customers/${id}/payments`, paymentData);
  },

  async updatePayment(paymentId, paymentData) {
    return await apiClient.put(`/customers/payments/${paymentId}`, paymentData);
  },

  async deletePayment(paymentId) {
    return await apiClient.delete(`/customers/payments/${paymentId}`);
  },

  async addNote(id, noteData) {
    return await apiClient.post(`/customers/${id}/notes`, noteData);
  },

  async updateNote(id, noteId, noteData) {
    return await apiClient.put(`/customers/${id}/notes/${noteId}`, noteData);
  },

  async deleteNote(id, noteId) {
    return await apiClient.delete(`/customers/${id}/notes/${noteId}`);
  },

  async addDocument(id, docData) {
    return await apiClient.post(`/customers/${id}/documents`, docData);
  },

  async deleteDocument(id, docId) {
    return await apiClient.delete(`/customers/${id}/documents/${docId}`);
  },
};
