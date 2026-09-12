import api from './axios';

export const getLeaveTypes   = ()             => api.get('/leaves/types');
export const getLeaveStats   = (params = {})  => api.get('/leaves/stats',   { params });
export const getLeaveBalance = (params = {})  => api.get('/leaves/balance', { params });

export const getLeaves       = (params = {})  => api.get('/leaves',         { params });
export const getLeave        = (id)           => api.get(`/leaves/${id}`);
export const applyLeave      = (data)         => api.post('/leaves',        data);
export const reviewLeave     = (id, data)     => api.put(`/leaves/${id}/review`, data);
export const cancelLeave     = (id)           => api.put(`/leaves/${id}/cancel`, {});
export const deleteLeave     = (id)           => api.delete(`/leaves/${id}`);
