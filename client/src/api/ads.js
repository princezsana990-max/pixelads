import { apiClient } from './client';

export const getAdsStatusApi = (userId) => {
  const query = userId ? `?userId=${userId}` : '';
  return apiClient(`/ads/status${query}`);
};

export const toggleAdsApi = (userId) => {
  return apiClient('/ads/toggle', {
    method: 'POST',
    body: JSON.stringify(userId ? { userId } : {})
  });
};

export const getAdsAttendanceApi = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.append(key, val);
    }
  });
  return apiClient(`/ads/attendance?${query.toString()}`);
};

export const markAttendanceApi = (payload) => {
  return apiClient('/ads/attendance/mark', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
};

export const deleteAttendanceApi = (id) => {
  return apiClient(`/ads/attendance/${id}`, {
    method: 'DELETE'
  });
};
