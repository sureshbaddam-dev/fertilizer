import { apiClient } from './apiClient';

export const settingService = {
  async getSettings() {
    return await apiClient.get('/settings/profile');
  },

  async updateSettings(data) {
    return await apiClient.put('/settings/profile', data);
  },

  async patchSettings(data) {
    return await apiClient.patch('/settings/profile', data);
  },

  async resetSettings() {
    return await apiClient.post('/settings/reset');
  },

  async getShopDiscount() {
    return await apiClient.get('/settings/shop-discount');
  },

  async updateShopDiscount(data) {
    return await apiClient.put('/settings/shop-discount', data);
  },
};
