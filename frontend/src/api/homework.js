import api from './axios';

export const getHomework    = (params = {}) => api.get('/homework', { params });
export const getHomeworkById = (id)         => api.get(`/homework/${id}`);
export const createHomework  = (data)       => api.post('/homework', data);
export const updateHomework  = (id, data)   => api.put(`/homework/${id}`, data);
export const deleteHomework  = (id)         => api.delete(`/homework/${id}`);
