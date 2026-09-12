import api from './axios';

export const getClasses = (params = {}) =>
  api.get('/classes', { params });

export const getClass = (id) =>
  api.get(`/classes/${id}`);

export const createClass = (data) =>
  api.post('/classes', data);

export const updateClass = (id, data) =>
  api.put(`/classes/${id}`, data);

export const deleteClass = (id) =>
  api.delete(`/classes/${id}`);

export const getClassStudents = (id, params = {}) =>
  api.get(`/classes/${id}/students`, { params });
