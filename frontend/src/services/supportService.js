import { apiClient } from './apiClient';

export const supportService = {
  createTicket: (data) => apiClient.post('/support/tickets', data),
  getUserTickets: () => apiClient.get('/support/tickets'),
  getTicketById: (id) => apiClient.get(`/support/tickets/${id}`),
  getAllTicketsAdmin: (status) => apiClient.get(`/support/admin/tickets${status ? `?status=${status}` : ''}`),
  resolveTicketAdmin: (id, data) => apiClient.post(`/support/admin/tickets/${id}/resolve`, data),
};
