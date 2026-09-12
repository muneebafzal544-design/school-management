import api from './axios';

export const getComplaints  = (params = {}) => api.get('/complaints', { params });
export const getComplaint   = (id)          => api.get(`/complaints/${id}`);
export const getSummary     = ()            => api.get('/complaints/summary');
export const createComplaint = (data)       => api.post('/complaints', data);
export const addResponse    = (id, data)    => api.post(`/complaints/${id}/respond`, data);
export const updateComplaint = (id, data)   => api.put(`/complaints/${id}`, data);
export const deleteComplaint = (id)         => api.delete(`/complaints/${id}`);
