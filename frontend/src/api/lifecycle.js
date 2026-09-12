import api from './axios';

export const getStudentTimeline = (studentId, params = {}) =>
  api.get(`/lifecycle/${studentId}`, { params });

export const getTimelineSummary = (studentId) =>
  api.get(`/lifecycle/${studentId}/summary`);

export const addManualNote = (studentId, data) =>
  api.post(`/lifecycle/${studentId}/note`, data);

export const getRecentEvents = (limit = 20) =>
  api.get('/lifecycle/recent', { params: { limit } });
