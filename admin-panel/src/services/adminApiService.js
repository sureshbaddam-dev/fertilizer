import axios from 'axios';

const getBackendBase = () => {
  let envUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.trim() : '';
  if (envUrl) {
    envUrl = envUrl.replace(/\/+$/, '');
    if (envUrl.endsWith('/api/v1')) {
      envUrl = envUrl.substring(0, envUrl.length - '/api/v1'.length);
    }
    return envUrl;
  }
  const host = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';
  return `http://${host}:5000`;
};

const BACKEND_BASE = getBackendBase();
const API_BASE_URL = `${BACKEND_BASE}/api/v1/admin`;

axios.defaults.withCredentials = true;

// Interceptor to handle 401 Unauthorized globally and avoid request loops
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const isAuthPath = typeof window !== 'undefined' && (window.location.pathname.includes('/auth') || window.location.pathname.includes('/login'));
      if (!isAuthPath) {
        localStorage.removeItem('adminAccessToken');
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

const getAuthHeaders = () => {
  const token = localStorage.getItem('adminAccessToken') || localStorage.getItem('accessToken');
  return {
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
    },
    withCredentials: true,
  };
};

export const adminApiService = {
  // Auth
  sendAdminOtp: async (mobile) => {
    const res = await axios.post(`${API_BASE_URL}/auth/send-otp`, { mobile });
    return res.data?.data;
  },

  verifyAdminOtp: async (mobile, otp) => {
    const res = await axios.post(`${API_BASE_URL}/auth/verify-otp`, { mobile, otp });
    const data = res.data?.data;
    if (data?.accessToken) {
      localStorage.setItem('adminAccessToken', data.accessToken);
      localStorage.setItem('accessToken', data.accessToken);
    }
    return data;
  },

  refreshAdminToken: async () => {
    const res = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, getAuthHeaders());
    const data = res.data?.data;
    if (data?.accessToken) {
      localStorage.setItem('adminAccessToken', data.accessToken);
      localStorage.setItem('accessToken', data.accessToken);
    }
    return data;
  },

  adminLogout: async () => {
    try {
      await axios.post(`${API_BASE_URL}/auth/logout`, {}, getAuthHeaders());
    } finally {
      localStorage.removeItem('adminAccessToken');
      localStorage.removeItem('accessToken');
    }
  },

  // Dashboard & Stats
  getDashboardStats: async () => {
    const res = await axios.get(`${API_BASE_URL}/dashboard/stats`, getAuthHeaders());
    return res.data?.data;
  },

  getDashboardAnalytics: async () => {
    const res = await axios.get(`${API_BASE_URL}/dashboard/analytics`, getAuthHeaders());
    return res.data?.data;
  },

  getRecentActivity: async () => {
    const res = await axios.get(`${API_BASE_URL}/dashboard/activity`, getAuthHeaders());
    return res.data?.data;
  },

  // Users Management
  getUsersList: async (params = {}) => {
    const res = await axios.get(`${API_BASE_URL}/users`, {
      ...getAuthHeaders(),
      params,
    });
    return res.data?.data;
  },

  getUserDetails: async (userId) => {
    const res = await axios.get(`${API_BASE_URL}/users/${userId}`, getAuthHeaders());
    return res.data?.data;
  },

  toggleUserStatus: async (userId, isActive) => {
    const res = await axios.patch(`${API_BASE_URL}/users/${userId}/status`, { isActive }, getAuthHeaders());
    return res.data?.data;
  },

  // Database Backups & Recovery
  createDatabaseBackup: async () => {
    const res = await axios.post(`${API_BASE_URL}/backups/create`, {}, getAuthHeaders());
    return res.data?.data;
  },

  getBackupOverview: async () => {
    const res = await axios.get(`${API_BASE_URL}/backups/overview`, getAuthHeaders());
    return res.data?.data;
  },

  getBackupHistory: async () => {
    const res = await axios.get(`${API_BASE_URL}/backups`, getAuthHeaders());
    return res.data?.data;
  },

  getBackupDetails: async (backupId) => {
    const res = await axios.get(`${API_BASE_URL}/backups/${backupId}`, getAuthHeaders());
    return res.data?.data;
  },

  downloadBackup: async (backupId, fileName = 'DATABASE_BACKUP.json') => {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_BASE_URL}/backups/${backupId}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Backup payload download failed');
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },

  deleteBackup: async (backupId, confirmationText = 'DELETE') => {
    const res = await axios.delete(`${API_BASE_URL}/backups/${backupId}`, {
      ...getAuthHeaders(),
      data: { confirmationText },
    });
    return res.data;
  },

  // Safe Missing-Records-Only Restore System
  analyzeRestore: async (backupId, targetUserId = 'ALL') => {
    const res = await axios.post(`${API_BASE_URL}/backups/${backupId}/restore/analyze`, { targetUserId }, getAuthHeaders());
    return res.data?.data;
  },

  executeRestore: async (backupId, payload) => {
    const res = await axios.post(`${API_BASE_URL}/backups/${backupId}/restore/execute`, payload, getAuthHeaders());
    return res.data?.data;
  },

  getRestoreHistory: async () => {
    const res = await axios.get(`${API_BASE_URL}/backups/restore/history`, getAuthHeaders());
    return res.data?.data;
  },

  // Subscriptions & Pricing
  grantAdminSubscription: async (data) => {
    const res = await axios.post(`${API_BASE_URL}/subscriptions/grant-plan`, data, getAuthHeaders());
    return res.data?.data;
  },

  grantCustomDemoSubscription: async (data) => {
    const res = await axios.post(`${API_BASE_URL}/subscriptions/grant-demo`, data, getAuthHeaders());
    return res.data?.data;
  },

  pauseSubscription: async (userId) => {
    const res = await axios.post(`${API_BASE_URL}/subscriptions/pause`, { userId }, getAuthHeaders());
    return res.data?.data;
  },

  resumeSubscription: async (userId) => {
    const res = await axios.post(`${API_BASE_URL}/subscriptions/resume`, { userId }, getAuthHeaders());
    return res.data?.data;
  },

  cancelSubscription: async (userId, reason) => {
    const res = await axios.post(`${API_BASE_URL}/subscriptions/cancel`, { userId, reason }, getAuthHeaders());
    return res.data?.data;
  },

  revokeDemoSubscription: async (userId, reason) => {
    const res = await axios.post(`${API_BASE_URL}/subscriptions/revoke-demo`, { userId, reason }, getAuthHeaders());
    return res.data?.data;
  },

  getSubscriptionSettings: async () => {
    const res = await axios.get(`${API_BASE_URL}/subscription-settings`, getAuthHeaders());
    return res.data?.data;
  },

  updateSubscriptionSettings: async (data) => {
    const res = await axios.put(`${API_BASE_URL}/subscription-settings`, data, getAuthHeaders());
    return res.data?.data;
  },

  getSubscriptionHistory: async () => {
    const res = await axios.get(`${API_BASE_URL}/subscriptions/history`, getAuthHeaders());
    return res.data?.data;
  },

  getVisitorAnalytics: async (period = 'MONTH') => {
    const res = await axios.get(`${API_BASE_URL}/analytics/visitors?period=${period}`, getAuthHeaders());
    return res.data?.data;
  },

  // Payments
  getPaymentsList: async () => {
    const res = await axios.get(`${API_BASE_URL}/payments`, getAuthHeaders());
    return res.data?.data;
  },

  // Admins & Roles
  getAdminsList: async () => {
    const res = await axios.get(`${API_BASE_URL}/admins`, getAuthHeaders());
    return res.data?.data;
  },

  createAdminUser: async (data) => {
    const res = await axios.post(`${API_BASE_URL}/admins`, data, getAuthHeaders());
    return res.data?.data;
  },

  // Notifications
  sendUserNotification: async (data) => {
    const res = await axios.post(`${API_BASE_URL}/notifications/user`, data, getAuthHeaders());
    return res.data?.data;
  },

  sendAdminNotification: async (data) => {
    const res = await axios.post(`${API_BASE_URL}/notifications/send`, data, getAuthHeaders());
    return res.data?.data;
  },

  getNotificationsHistory: async () => {
    const res = await axios.get(`${API_BASE_URL}/notifications/history`, getAuthHeaders());
    return res.data?.data;
  },

  // Audit Logs
  getAuditLogs: async () => {
    const res = await axios.get(`${API_BASE_URL}/audit-logs`, getAuthHeaders());
    return res.data?.data;
  },

  // System Settings
  getSystemSettings: async () => {
    const res = await axios.get(`${API_BASE_URL}/settings`, getAuthHeaders());
    return res.data?.data;
  },

  updateSystemSetting: async (key, value) => {
    const res = await axios.patch(`${API_BASE_URL}/settings`, { key, value }, getAuthHeaders());
    return res.data?.data;
  },

  // Support Requests & Unread Notifications
  getSupportTickets: async (queryArg = {}) => {
    let opts = {};
    if (typeof queryArg === 'string') {
      opts = { status: queryArg };
    } else if (queryArg && typeof queryArg === 'object') {
      opts = queryArg;
    }

    const { status, priority, category, search } = opts;
    const backendRoot = API_BASE_URL.replace('/admin', '');
    const params = new URLSearchParams();

    if (status && status !== 'ALL') params.append('status', status);
    if (priority && priority !== 'ALL') params.append('priority', priority);
    if (category && category !== 'ALL') params.append('category', category);

    if (search && typeof search === 'string' && search.trim()) {
      params.append('search', search.trim());
    }
    
    const queryString = params.toString();
    const res = await axios.get(`${backendRoot}/support/admin/tickets${queryString ? `?${queryString}` : ''}`, getAuthHeaders());
    return res.data?.data?.tickets || [];
  },

  getSupportTicketById: async (ticketId) => {
    const backendRoot = API_BASE_URL.replace('/admin', '');
    const res = await axios.get(`${backendRoot}/support/admin/tickets/${ticketId}`, getAuthHeaders());
    return res.data?.data?.ticket;
  },

  addAdminSupportReply: async (ticketId, message, status, attachments) => {
    const backendRoot = API_BASE_URL.replace('/admin', '');
    const res = await axios.post(`${backendRoot}/support/admin/tickets/${ticketId}/reply`, { message, status, attachments }, getAuthHeaders());
    return res.data?.data?.ticket;
  },

  updateSupportTicketStatus: async (ticketId, status, adminReply) => {
    const backendRoot = API_BASE_URL.replace('/admin', '');
    const res = await axios.patch(`${backendRoot}/support/admin/tickets/${ticketId}/status`, { status, adminReply }, getAuthHeaders());
    return res.data?.data?.ticket;
  },

  uploadSupportAttachment: async (formData) => {
    const backendRoot = API_BASE_URL.replace('/admin', '');
    const headers = { ...getAuthHeaders().headers, 'Content-Type': 'multipart/form-data' };
    const res = await axios.post(`${backendRoot}/support/upload-attachment`, formData, { headers });
    return res.data?.data;
  },

  getUnreadSupportNotifications: async () => {
    const backendRoot = API_BASE_URL.replace('/admin', '');
    const res = await axios.get(`${backendRoot}/support/admin/notifications/unread`, getAuthHeaders());
    return res.data?.data?.notifications || [];
  },

  markSupportNotificationRead: async (id) => {
    const backendRoot = API_BASE_URL.replace('/admin', '');
    const res = await axios.patch(`${backendRoot}/support/admin/notifications/${id}/read`, {}, getAuthHeaders());
    return res.data;
  },
};
