import { apiClient } from './client';

export const getInvoicesApi = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') query.append(key, val);
  });
  return apiClient(`/invoices?${query.toString()}`);
};

export const getInvoiceByIdApi = (id) => apiClient(`/invoices/${id}`);

export const createInvoiceApi = (payload) =>
  apiClient('/invoices', { method: 'POST', body: JSON.stringify(payload) });

export const updateInvoiceApi = (id, payload) =>
  apiClient(`/invoices/${id}`, { method: 'PUT', body: JSON.stringify(payload) });

export const recordInvoicePaymentApi = (id, payload) =>
  apiClient(`/invoices/${id}/payment`, { method: 'POST', body: JSON.stringify(payload) });

export const deleteInvoiceApi = (id) =>
  apiClient(`/invoices/${id}`, { method: 'DELETE' });
