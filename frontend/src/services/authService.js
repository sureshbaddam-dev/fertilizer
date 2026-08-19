import { apiClient } from './apiClient';
import { queryClient } from '../utils/queryClient';

let listeners = [];
let isInitializing = true;

const notifyListeners = () => {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch (_e) {}
  });
};


const saveTokens = (data) => {
  if (data?.accessToken) {
    localStorage.setItem('vedixa_access_token', data.accessToken);
    localStorage.setItem('mandhi_access_token', data.accessToken);
  }
  if (data?.user) {
    localStorage.setItem('vedixa_user', JSON.stringify(data.user));
    localStorage.setItem('mandhi_user', JSON.stringify(data.user));
  }
  try {
    queryClient.invalidateQueries(['user-profile']);
    queryClient.invalidateQueries(['shop-settings-global']);
    queryClient.invalidateQueries(['shop-settings-profile']);
    queryClient.invalidateQueries(['my-subscription']);
  } catch (_e) {}
};

const clearTokens = () => {
  queryClient.clear();
  localStorage.removeItem('vedixa_access_token');
  localStorage.removeItem('vedixa_refresh_token');
  localStorage.removeItem('vedixa_user');
  localStorage.removeItem('mandhi_access_token');
  localStorage.removeItem('mandhi_refresh_token');
  localStorage.removeItem('mandhi_user');
};

export const authService = {
  get isInitializing() {
    return isInitializing;
  },

  subscribe(fn) {
    listeners.push(fn);
    try {
      fn();
    } catch (_e) {}
    return () => {
      listeners = listeners.filter((l) => l !== fn);
    };
  },


  async signup(data) {
    return await apiClient.post('/auth/signup', data);
  },

  async signupEmail(data) {
    return await apiClient.post('/auth/signup/email', data);
  },

  async verifyEmail(token) {
    return await apiClient.post('/auth/verify-email', { token });
  },

  async resendVerification(email) {
    return await apiClient.post('/auth/resend-verification', { email });
  },

  async googleAuth(idToken) {
    const response = await apiClient.post('/auth/google', { idToken });
    if (response.success && response.data?.accessToken) {
      saveTokens(response.data);
      notifyListeners();
    }
    return response;
  },

  async completeGoogleSignup(data) {
    const response = await apiClient.post('/auth/google/complete-profile', data);
    if (response.success && response.data?.accessToken) {
      saveTokens(response.data);
      notifyListeners();
    }
    return response;
  },

  async verifySignupOtp(data) {
    const response = await apiClient.post('/auth/verify-signup-otp', data);
    if (response.success && response.data?.accessToken) {
      saveTokens(response.data);
      notifyListeners();
    }
    return response;
  },

  async login(data) {
    const response = await apiClient.post('/auth/login', data);
    if (response.success && response.data?.accessToken) {
      saveTokens(response.data);
      notifyListeners();
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

  async refreshToken() {
    try {
      const response = await apiClient.post('/auth/refresh', {});
      const payload = response.data || response;
      if (payload?.accessToken) {
        saveTokens(payload);
        notifyListeners();
        return payload;
      } else {
        throw new Error('Invalid refresh response structure');
      }
    } catch (err) {
      clearTokens();
      notifyListeners();
      throw err;
    }
  },

  async logout() {
    try {
      await apiClient.post('/auth/logout', {});
    } catch (_err) {
      // Continue cleanup regardless
    } finally {
      clearTokens();
      notifyListeners();
    }
  },

  handleForceLogout() {
    clearTokens();
    notifyListeners();
  },

  getCurrentUser() {
    const userStr = localStorage.getItem('vedixa_user') || localStorage.getItem('mandhi_user');
    return userStr ? JSON.parse(userStr) : null;
  },

  getAccessToken() {
    return localStorage.getItem('vedixa_access_token') || localStorage.getItem('mandhi_access_token');
  },

  isAuthenticated() {
    return !!this.getAccessToken();
  },

  async initAuth() {
    try {
      const token = this.getAccessToken();

      if (!token) {
        clearTokens();
      } else {
        let isExpired = false;
        try {
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            const expMs = payload.exp * 1000;
            if (Date.now() >= expMs - 30000) {
              isExpired = true;
            }
          } else {
            isExpired = true;
          }
        } catch (_e) {
          isExpired = true;
        }

        if (isExpired) {
          try {
            await this.refreshToken();
          } catch (_err) {
            clearTokens();
          }
        }
      }
    } catch (_err) {
      clearTokens();
    } finally {
      isInitializing = false;
      notifyListeners();
    }
  },

  async getProfile() {
    return await apiClient.get('/auth/me');
  },

  async updateProfile(data) {
    const res = await apiClient.put('/auth/me', data);
    if (res.success && res.data) {
      localStorage.setItem('vedixa_user', JSON.stringify(res.data));
      localStorage.setItem('mandhi_user', JSON.stringify(res.data));
      notifyListeners();
    }
    return res;
  },
};

// Initialize session check on boot
authService.initAuth();


