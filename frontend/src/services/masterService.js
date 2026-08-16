import { apiClient } from './apiClient';

export const masterService = {
  // Batch Fetch All Active Masters
  async getAllMasters() {
    return await apiClient.get('/masters/all');
  },



  // Brands Master APIs (Product Brands owned by Company)
  async getBrands(params = {}) {
    return await apiClient.get('/masters/brands', { params });
  },

  async getBrandById(id) {
    return await apiClient.get(`/masters/brands/${id}`);
  },

  async createBrand(data) {
    return await apiClient.post('/masters/brands', data);
  },

  async createCompany(data) {
    return await apiClient.post('/masters/brands', data);
  },

  async updateBrand({ id, ...data }) {
    return await apiClient.put(`/masters/brands/${id}`, data);
  },

  async deactivateBrand(id) {
    return await apiClient.patch(`/masters/brands/${id}/deactivate`);
  },

  async restoreBrand(id) {
    return await apiClient.patch(`/masters/brands/${id}/activate`);
  },

  // Categories Master APIs
  async getCategories(params = {}) {
    return await apiClient.get('/masters/categories', { params });
  },

  async getCategoryById(id) {
    return await apiClient.get(`/masters/categories/${id}`);
  },

  async createCategory(data) {
    return await apiClient.post('/masters/categories', data);
  },

  async updateCategory({ id, ...data }) {
    return await apiClient.put(`/masters/categories/${id}`, data);
  },

  async deactivateCategory(id) {
    return await apiClient.patch(`/masters/categories/${id}/deactivate`);
  },

  async restoreCategory(id) {
    return await apiClient.patch(`/masters/categories/${id}/activate`);
  },

  // Units Master APIs
  async getUnits(params = {}) {
    return await apiClient.get('/masters/units', { params });
  },

  async getUnitById(id) {
    return await apiClient.get(`/masters/units/${id}`);
  },

  async createUnit(data) {
    return await apiClient.post('/masters/units', data);
  },

  async updateUnit({ id, ...data }) {
    return await apiClient.put(`/masters/units/${id}`, data);
  },

  async deactivateUnit(id) {
    return await apiClient.patch(`/masters/units/${id}/deactivate`);
  },

  async restoreUnit(id) {
    return await apiClient.patch(`/masters/units/${id}/activate`);
  },
};
