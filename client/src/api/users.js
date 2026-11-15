import { apiClient } from './client';

export const getUsersApi = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.append(key, val);
    }
  });
  return apiClient(`/users?${query.toString()}`);
};

export const getUserByIdApi = (id) => {
  return apiClient(`/users/${id}`);
};

export const createUserApi = (payload) => {
  return apiClient('/users', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
};

export const updateUserApi = (id, payload) => {
  return apiClient(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
};

export const updateCredentialsApi = (id, payload) => {
  return apiClient(`/users/${id}/credentials`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
};

export const updateStatusApi = (id, is_blocked) => {
  return apiClient(`/users/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ is_blocked })
  });
};

export const deleteUserApi = (id) => {
  return apiClient(`/users/${id}`, {
    method: 'DELETE'
  });
};
