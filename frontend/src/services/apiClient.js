import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
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

// Response Interceptor
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const formattedError = {
      success: false,
      message: error.response?.data?.message || 'An unexpected error occurred',
      errors: error.response?.data?.errors || null,
      statusCode: error.response?.status || 500,
    };
    return Promise.reject(formattedError);
  }
);
