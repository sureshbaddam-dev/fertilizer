import { apiClient } from './apiClient';

export const authService = {
  async signup(data) {
    return await apiClient.post('/auth/signup', data);
  },

  async verifySignupOtp(data) {
    const response = await apiClient.post('/auth/verify-signup-otp', data);
    if (response.success && response.data?.accessToken) {
      localStorage.setItem('vedixa_access_token', response.data.accessToken);
      localStorage.setItem('vedixa_refresh_token', response.data.refreshToken);
      localStorage.setItem('vedixa_user', JSON.stringify(response.data.user));
      localStorage.setItem('mandhi_access_token', response.data.accessToken);
      localStorage.setItem('mandhi_refresh_token', response.data.refreshToken);
      localStorage.setItem('mandhi_user', JSON.stringify(response.data.user));
    }
    return response;
  },

  async login(data) {
    const response = await apiClient.post('/auth/login', data);
    if (response.success && response.data?.accessToken) {
      localStorage.setItem('vedixa_access_token', response.data.accessToken);
      localStorage.setItem('vedixa_refresh_token', response.data.refreshToken);
      localStorage.setItem('vedixa_user', JSON.stringify(response.data.user));
      localStorage.setItem('mandhi_access_token', response.data.accessToken);
      localStorage.setItem('mandhi_refresh_token', response.data.refreshToken);
      localStorage.setItem('mandhi_user', JSON.stringify(response.data.user));
    }
    return response;
  },

  async forgotPassword(data) {
    return await apiClient.post('/auth/forgot-password', data);
  },

  async verifyForgotOtp(data) {
    return await apiClient.post('/auth/verify-forgot-otp', data);
  },

  async resetPassword(data) {
    return await apiClient.post('/auth/reset-password', data);
  },

  async logout() {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      localStorage.removeItem('vedixa_access_token');
      localStorage.removeItem('vedixa_refresh_token');
      localStorage.removeItem('vedixa_user');
      localStorage.removeItem('mandhi_access_token');
      localStorage.removeItem('mandhi_refresh_token');
      localStorage.removeItem('mandhi_user');
    }
  },

  getCurrentUser() {
    const userStr = localStorage.getItem('vedixa_user') || localStorage.getItem('mandhi_user');
    return userStr ? JSON.parse(userStr) : null;
  },

  isAuthenticated() {
    return !!(localStorage.getItem('vedixa_access_token') || localStorage.getItem('mandhi_access_token'));
  },
};
