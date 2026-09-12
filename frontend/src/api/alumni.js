import api from './axios';
export const getAlumni        = (params) => api.get('/alumni', { params });
export const graduateStudent  = (data)   => api.post('/alumni', data);
export const updateAlumni     = (id, d)  => api.put(`/alumni/${id}`, d);
export const deleteAlumni     = (id)     => api.delete(`/alumni/${id}`);
