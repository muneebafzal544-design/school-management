import api from './axios';

export const getIncidents    = (params = {}) => api.get('/discipline', { params });
export const getIncident     = (id)          => api.get(`/discipline/${id}`);
export const getSummary      = ()            => api.get('/discipline/summary');
export const getTrend        = ()            => api.get('/discipline/trend');
export const createIncident  = (data)        => api.post('/discipline', data);
export const updateIncident  = (id, data)    => api.put(`/discipline/${id}`, data);
export const resolveIncident = (id, data)    => api.post(`/discipline/${id}/resolve`, data);
export const deleteIncident  = (id)          => api.delete(`/discipline/${id}`);
