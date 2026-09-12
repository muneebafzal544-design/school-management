import api from './axios';

export const getSubstitutions     = (params = {}) => api.get('/substitutions', { params });
export const getTodaySubstitutions = ()            => api.get('/substitutions/today');
export const getAvailableTeachers = (date)         => api.get('/substitutions/available', { params: { date } });
export const getSummary           = ()             => api.get('/substitutions/summary');
export const createSubstitution   = (data)         => api.post('/substitutions', data);
export const updateSubstitution   = (id, data)     => api.put(`/substitutions/${id}`, data);
export const updateStatus         = (id, status)   => api.put(`/substitutions/${id}/status`, { status });
export const deleteSubstitution   = (id)           => api.delete(`/substitutions/${id}`);
