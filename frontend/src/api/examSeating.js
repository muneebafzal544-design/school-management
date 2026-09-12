import api from './axios';

export const getHalls        = ()           => api.get('/exam-seating/halls');
export const createHall      = (data)       => api.post('/exam-seating/halls', data);
export const updateHall      = (id, data)   => api.put(`/exam-seating/halls/${id}`, data);
export const deleteHall      = (id)         => api.delete(`/exam-seating/halls/${id}`);

export const getPlans        = (params = {}) => api.get('/exam-seating', { params });
export const getPlan         = (id)          => api.get(`/exam-seating/${id}`);
export const generatePlan    = (data)        => api.post('/exam-seating/generate', data);
export const deletePlan      = (id)          => api.delete(`/exam-seating/${id}`);
