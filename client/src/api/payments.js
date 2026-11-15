import { apiClient } from './client';

export const getPaymentsSummaryApi = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.append(key, val);
    }
  });
  return apiClient(`/payments/summary?${query.toString()}`);
};

export const updateOrderPaymentApi = (orderId, payload) => {
  return apiClient(`/payments/orders/${orderId}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
};

export const recordManualPaymentApi = (orderId, payload) => {
  return apiClient(`/payments/orders/${orderId}/manual`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
};
