import { apiClient } from './client';

export const exportReportApi = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.append(key, val);
    }
  });
  return apiClient(`/reports/export?${query.toString()}`);
};

export const bulkImportApi = (formData) => {
  return apiClient('/import/bulk', {
    method: 'POST',
    body: formData
  });
};
