import api from './axios';

export const getTopics     = (p)     => api.get('/syllabus',              { params: p });
export const getStats      = (p)     => api.get('/syllabus/stats',        { params: p });
export const createTopic   = (d)     => api.post('/syllabus',             d);
export const updateTopic   = (id, d) => api.put(`/syllabus/${id}`,        d);
export const markComplete  = (id, d) => api.patch(`/syllabus/${id}/complete`, d);
export const deleteTopic   = (id)    => api.delete(`/syllabus/${id}`);
