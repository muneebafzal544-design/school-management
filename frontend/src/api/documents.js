import api from './axios';

export const getDocuments = (params = {}) =>
  api.get('/documents', { params });

export const getDocument = (id) =>
  api.get(`/documents/${id}`);

export const uploadDocument = (data) =>
  api.post('/documents', data, {
    headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
  });

export const updateDocument = (id, data) =>
  api.put(`/documents/${id}`, data);

export const deleteDocument = (id) =>
  api.delete(`/documents/${id}`);
