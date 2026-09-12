import api from './axios';

export const getHostels      = ()           => api.get('/hostel');
export const createHostel    = (data)       => api.post('/hostel', data);
export const updateHostel    = (id, data)   => api.put(`/hostel/${id}`, data);
export const deleteHostel    = (id)         => api.delete(`/hostel/${id}`);
export const getSummary      = ()           => api.get('/hostel/summary');

export const getRooms        = (params = {}) => api.get('/hostel/rooms', { params });
export const createRoom      = (data)        => api.post('/hostel/rooms', data);
export const updateRoom      = (id, data)    => api.put(`/hostel/rooms/${id}`, data);
export const deleteRoom      = (id)          => api.delete(`/hostel/rooms/${id}`);

export const getBoarders     = (params = {}) => api.get('/hostel/boarders', { params });
export const assignBoarder   = (data)        => api.post('/hostel/boarders', data);
export const checkOutBoarder = (id, data)    => api.put(`/hostel/boarders/${id}/checkout`, data);
export const getHostelFeeHeads = ()          => api.get('/hostel/fee-heads');
