import axios from 'axios';

const BACKEND_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API_BASE_URL = `${BACKEND_BASE}/api/v1/admin`;

axios.defaults.withCredentials = true;

const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return {
    headers: {
      Authorization: `Bearer ${token}`,
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
      localStorage.setItem('accessToken', data.accessToken);
    }
    return data;
  },

  refreshAdminToken: async () => {
    const res = await axios.post(`${API_BASE_URL}/auth/refresh`);
    const data = res.data?.data;
    if (data?.accessToken) {
      localStorage.setItem('accessToken', data.accessToken);
    }
    return data;
  },

  adminLogout: async () => {
    try {
      await axios.post(`${API_BASE_URL}/auth/logout`, {}, getAuthHeaders());
    } finally {
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

  // Support Tickets & Unread Notifications
  getSupportTickets: async (status) => {
    const backendRoot = API_BASE_URL.replace('/admin', '');
    const res = await axios.get(`${backendRoot}/support/admin/tickets${status ? `?status=${status}` : ''}`, getAuthHeaders());
    return res.data?.data?.tickets || [];
  },

  updateSupportTicketStatus: async (ticketId, status, adminReply) => {
    const backendRoot = API_BASE_URL.replace('/admin', '');
    const res = await axios.patch(`${backendRoot}/support/admin/tickets/${ticketId}/status`, { status, adminReply }, getAuthHeaders());
    return res.data?.data?.ticket;
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

  // Demo Requests
  getDemoRequests: async (status) => {
    const backendRoot = API_BASE_URL.replace('/admin', '');
    const res = await axios.get(`${backendRoot}/subscriptions/admin/demo-requests${status ? `?status=${status}` : ''}`, getAuthHeaders());
    return res.data?.data?.demoRequests || [];
  },

  approveDemoRequest: async (id, adminNotes) => {
    const backendRoot = API_BASE_URL.replace('/admin', '');
    const res = await axios.post(`${backendRoot}/subscriptions/admin/demo-requests/${id}/approve`, { adminNotes }, getAuthHeaders());
    return res.data?.data?.demoRequest;
  },

  rejectDemoRequest: async (id, adminNotes) => {
    const backendRoot = API_BASE_URL.replace('/admin', '');
    const res = await axios.post(`${backendRoot}/subscriptions/admin/demo-requests/${id}/reject`, { adminNotes }, getAuthHeaders());
    return res.data?.data?.demoRequest;
  },
};
