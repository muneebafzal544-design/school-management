import api from './axios';

export const getAuditLogs = (params = {}) =>
  api.get('/audit/logs', { params });

export const getAuditLog = (id) =>
  api.get(`/audit/logs/${id}`);

export const getAuditSummary = () =>
  api.get('/audit/summary');
