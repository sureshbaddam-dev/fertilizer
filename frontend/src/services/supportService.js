import { apiClient } from './apiClient';

export const supportService = {
  createTicket: (data) => apiClient.post('/support/tickets', data),
  getUserTickets: (status) => apiClient.get(`/support/tickets${status ? `?status=${status}` : ''}`),
  getTicketById: (id) => apiClient.get(`/support/tickets/${id}`),
  addReply: (id, data) => apiClient.post(`/support/tickets/${id}/reply`, data),
  reopenRequest: (id, data) => apiClient.post(`/support/tickets/${id}/reopen`, data),
  uploadAttachment: (formData) =>
    apiClient.post('/support/upload-attachment', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};
