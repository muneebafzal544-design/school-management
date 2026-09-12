import api from './axios';

export const getPapers       = (params = {}) => api.get('/papers',                       { params });
export const createPaper     = (data)        => api.post('/papers',                       data);
export const getPaper        = (id)          => api.get(`/papers/${id}`);
export const updatePaper     = (id, data)    => api.put(`/papers/${id}`,                  data);
export const deletePaper     = (id)          => api.delete(`/papers/${id}`);

export const getTeacherUsers = ()            => api.get('/papers/teacher-users');
export const updateSection   = (id, data)    => api.put(`/papers/sections/${id}`,         data);

export const addQuestion     = (sectionId, data) => api.post(`/papers/sections/${sectionId}/questions`, data);
export const updateQuestion  = (id, data)    => api.put(`/papers/questions/${id}`,        data);
export const deleteQuestion  = (id)          => api.delete(`/papers/questions/${id}`);
