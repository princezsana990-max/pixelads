const API_BASE = '/api';

export const apiClient = async (endpoint, options = {}) => {
  const url = `${API_BASE}${endpoint}`;

  const token = localStorage.getItem('pixel_ads_token');

  const headers = {
    ...options.headers
  };

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include'
  });

  const contentType = response.headers.get('content-type');
  if (contentType && (contentType.includes('text/csv') || contentType.includes('vnd.openxmlformats'))) {
    return response.blob();
  }

  let data;
  try {
    data = await response.json();
  } catch (err) {
    data = null;
  }

  if (!response.ok) {
    const errorMsg = data?.message || `Request failed with status ${response.status}`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.errors = data?.errors;
    throw err;
  }

  return data?.data !== undefined ? data.data : data;
};
