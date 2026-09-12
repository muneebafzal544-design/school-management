import api from './axios';

const BASE = '/online-classes';

export const getOnlineClasses  = (params = {}) => api.get(BASE, { params });
export const getMyClasses      = (params = {}) => api.get(`${BASE}/my`, { params });
export const getOnlineClass    = (id)          => api.get(`${BASE}/${id}`);
export const createOnlineClass = (data)        => api.post(BASE, data);
export const updateOnlineClass = (id, data)    => api.put(`${BASE}/${id}`, data);
export const cancelOnlineClass = (id, data)    => api.delete(`${BASE}/${id}`, { data });
export const updateClassStatus = (id, status)  => api.patch(`${BASE}/${id}/status`, { status });
export const joinOnlineClass   = (id)          => api.post(`${BASE}/${id}/join`);
export const getClassAttendance= (id)          => api.get(`${BASE}/${id}/attendance`);
export const getOnlineClassStats = ()          => api.get(`${BASE}/stats`);
