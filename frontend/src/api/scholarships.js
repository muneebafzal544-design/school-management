import api from './axios';
export const getApplications    = (params) => api.get('/scholarships', { params });
export const createApplication  = (data)   => api.post('/scholarships', data);
export const reviewApplication  = (id, d)  => api.put(`/scholarships/${id}/review`, d);
export const deleteApplication  = (id)     => api.delete(`/scholarships/${id}`);
