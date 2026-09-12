import api from './axios';

export const getVisitors      = (params = {}) => api.get('/visitors', { params });
export const getVisitorStats  = ()            => api.get('/visitors/stats');
export const createVisitor    = (data)        => api.post('/visitors', data);
export const exitVisitor      = (id)          => api.patch(`/visitors/${id}/exit`);
export const markBadgePrinted = (id)          => api.patch(`/visitors/${id}/badge`);
export const deleteVisitor    = (id)          => api.delete(`/visitors/${id}`);
