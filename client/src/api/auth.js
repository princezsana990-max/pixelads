import { apiClient } from './client';

export const loginApi = (credentials) => {
  return apiClient('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials)
  });
};

export const logoutApi = () => {
  return apiClient('/auth/logout', {
    method: 'POST'
  });
};

export const getMeApi = () => {
  return apiClient('/auth/me', {
    method: 'GET'
  });
};
