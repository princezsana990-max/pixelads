import { apiClient } from './client';

export const lookupCustomerApi = (phone) =>
  apiClient(`/communications/lookup?phone=${encodeURIComponent(phone)}`);

export const logCommunicationApi = (payload) =>
  apiClient('/communications', { method: 'POST', body: JSON.stringify(payload) });

export const getCommunicationsApi = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') query.append(key, val);
  });
  return apiClient(`/communications?${query.toString()}`);
};
