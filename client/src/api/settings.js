import { apiClient } from './client';

export const getSettingsApi = () => {
  return apiClient('/settings');
};

export const updateSettingsApi = (payload) => {
  return apiClient('/settings', {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
};

export const getDashboardStatsApi = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.append(key, val);
    }
  });
  return apiClient(`/settings/dashboard-stats?${query.toString()}`);
};

export const getSignedUploadUrlApi = (fileName, bucket = 'order-files') => {
  return apiClient('/storage/sign-url', {
    method: 'POST',
    body: JSON.stringify({ fileName, bucket })
  });
};
