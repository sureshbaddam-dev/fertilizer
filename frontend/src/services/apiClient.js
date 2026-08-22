import axios from 'axios';

export const getApiBaseUrl = () => {
  let url = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
  if (url.includes('192.168.31.85')) {
    url = 'http://localhost:5000/api/v1';
  }
  if (typeof window !== 'undefined' && window.location.hostname) {
    const currentHost = window.location.hostname;
    if (currentHost !== 'localhost' && currentHost !== '127.0.0.1') {
      return url.replace(/localhost|127\.0\.0\.1/, currentHost);
    }
  }
  return url;
};

const API_BASE_URL = getApiBaseUrl();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('vedixa_access_token') || localStorage.getItem('mandhi_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response Interceptor
apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      const requestUrl = originalRequest.url || '';

      if (
        requestUrl.includes('/auth/refresh') ||
        requestUrl.includes('/auth/login') ||
        requestUrl.includes('/auth/signup') ||
        requestUrl.includes('/auth/verify-signup-otp')
      ) {
        return Promise.reject({
          success: false,
          message: error.response?.data?.message || 'Authentication failed',
          statusCode: 401,
        });
      }

      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      isRefreshing = true;

      try {
        const { authService } = await import('./authService');
        const refreshRes = await authService.refreshToken();
        const newToken = refreshRes?.accessToken || refreshRes?.data?.accessToken;
        if (newToken) {
          processQueue(null, newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(originalRequest);
        } else {
          throw new Error('Refresh token returned empty response');
        }
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        try {
          const { authService } = await import('./authService');
          authService.handleForceLogout();
        } catch (_e) {}
        return Promise.reject({
          success: false,
          message: 'Session expired. Please log in again.',
          statusCode: 401,
        });
      } finally {
        isRefreshing = false;
      }
    }

    const errorMessage =
      error.response?.data?.message ||
      error.response?.data?.error ||
      (typeof error.response?.data === 'string' ? error.response.data : null) ||
      error.message ||
      'An unexpected error occurred';

    const formattedError = {
      success: false,
      message: errorMessage,
      errors: error.response?.data?.errors || null,
      statusCode: error.response?.status || 500,
    };
    return Promise.reject(formattedError);
  }
);
