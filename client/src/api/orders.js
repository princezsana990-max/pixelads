import { apiClient } from './client';

export const getOrdersApi = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.append(key, val);
    }
  });
  return apiClient(`/orders?${query.toString()}`);
};

export const getOrderByIdApi = (id) => {
  return apiClient(`/orders/${id}`);
};

export const createOrderApi = (payload) => {
  return apiClient('/orders', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
};

export const updateOrderApi = (id, payload) => {
  return apiClient(`/orders/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
};

export const deleteOrderApi = (id) => {
  return apiClient(`/orders/${id}`, {
    method: 'DELETE'
  });
};

export const recoverOrderApi = (id) => {
  return apiClient(`/orders/${id}/recover`, {
    method: 'POST'
  });
};

export const updateAdStatusApi = (id, payload) => {
  return apiClient(`/orders/${id}/ad-status`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
};

export const assignOrderApi = (id, editor_id) => {
  return apiClient(`/orders/${id}/assign`, {
    method: 'POST',
    body: JSON.stringify({ editor_id })
  });
};

export const submitWorkApi = (id, payload) => {
  return apiClient(`/orders/${id}/submit-work`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
};

export const requestRevisionApi = (id, notes) => {
  return apiClient(`/orders/${id}/revision`, {
    method: 'POST',
    body: JSON.stringify({ notes })
  });
};

export const approveWorkApi = (id) => {
  return apiClient(`/orders/${id}/approve`, {
    method: 'POST'
  });
};

export const finalizeOrderApi = (id) => {
  return apiClient(`/orders/${id}/finalize`, {
    method: 'POST'
  });
};

export const getOrderMessagesApi = (id) => {
  return apiClient(`/orders/${id}/messages`);
};

export const sendOrderMessageApi = (id, payload) => {
  return apiClient(`/orders/${id}/messages`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
};

export const markMessagesReadApi = (id) => {
  return apiClient(`/orders/${id}/messages/read`, {
    method: 'PATCH'
  });
};
