import { apiClient } from './apiClient';
import { queryClient } from '../utils/queryClient';
import { normalizeUser } from '../utils/imageUtils';

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
  if (data?.refreshToken) {
    localStorage.setItem('vedixa_refresh_token', data.refreshToken);
    localStorage.setItem('mandhi_refresh_token', data.refreshToken);
  }
  if (data?.user) {
    const normalized = normalizeUser(data.user);
    localStorage.setItem('vedixa_user', JSON.stringify(normalized));
    localStorage.setItem('mandhi_user', JSON.stringify(normalized));
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
    return () => {
      listeners = listeners.filter((l) => l !== fn);
    };
  },


  async checkEmailAvailability(email, options = {}) {
    const { signal } = options;
    return await apiClient.get('/auth/check-email', { params: { email }, signal });
  },

  async signup(data) {
    return await apiClient.post('/auth/signup', data);
  },

  async initiateSignupOtp(data) {
    return await apiClient.post('/auth/signup/initiate-otp', data);
  },

  async signupEmail(data) {
    return await apiClient.post('/auth/signup/initiate-otp', data);
  },

  async resendSignupOtp(email) {
    return await apiClient.post('/auth/signup/resend-otp', { email });
  },

  async verifyEmail(token) {
    return await apiClient.post('/auth/verify-email', { token });
  },

  async resendVerification(email) {
    return await apiClient.post('/auth/resend-verification', { email });
  },

  async googleAuth(idToken) {
    clearTokens();
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
    const response = await apiClient.post('/auth/signup/verify-otp', data);
    if (response.success && response.data) {
      if (response.data.accessToken) {
        localStorage.setItem('vedixa_access_token', response.data.accessToken);
        localStorage.setItem('mandhi_access_token', response.data.accessToken);
      }
      if (response.data.refreshToken) {
        localStorage.setItem('vedixa_refresh_token', response.data.refreshToken);
        localStorage.setItem('mandhi_refresh_token', response.data.refreshToken);
      }
      if (response.data.user) {
        localStorage.setItem('vedixa_user', JSON.stringify(response.data.user));
        localStorage.setItem('mandhi_user', JSON.stringify(response.data.user));
      }
    }
    return response;
  },

  async completeOnboarding(data) {
    const response = await apiClient.post('/auth/complete-onboarding', data);
    if (response.success && response.data?.user) {
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
      const storedRefreshToken = localStorage.getItem('vedixa_refresh_token') || localStorage.getItem('mandhi_refresh_token');
      const response = await apiClient.post('/auth/refresh', { refreshToken: storedRefreshToken }, {
        headers: storedRefreshToken ? { Authorization: `Bearer ${storedRefreshToken}` } : {}
      });
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
    if (!userStr) return null;
    try {
      return normalizeUser(JSON.parse(userStr));
    } catch (_e) {
      return null;
    }
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
        } else {
          // If token is valid but user profile in localStorage is missing or needs sync
          const currentUser = this.getCurrentUser();
          if (!currentUser) {
            try {
              const res = await this.getProfile();
              const profileData = res?.data || res;
              if (profileData) {
                const normalized = normalizeUser(profileData);
                localStorage.setItem('vedixa_user', JSON.stringify(normalized));
                localStorage.setItem('mandhi_user', JSON.stringify(normalized));
              }
            } catch (_err) {
              // Non-fatal, token is still active
            }
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
      const normalized = normalizeUser(res.data);
      localStorage.setItem('vedixa_user', JSON.stringify(normalized));
      localStorage.setItem('mandhi_user', JSON.stringify(normalized));
      notifyListeners();
    }
    return res;
  },
};

// Initialize session check on boot
authService.initAuth();


