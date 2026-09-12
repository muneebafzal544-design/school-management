import api from './axios';
export const createSlots   = (data)   => api.post('/meetings/slots', data);
export const getSlots      = (params) => api.get('/meetings/slots', { params });
export const deleteSlot    = (id)     => api.delete(`/meetings/slots/${id}`);
export const bookSlot      = (id, d)  => api.post(`/meetings/slots/${id}/book`, d);
export const cancelBooking = (id)     => api.put(`/meetings/bookings/${id}/cancel`);
export const getBookings   = (params) => api.get('/meetings/bookings', { params });
export const getSchedulePrint = (params) => api.get('/meetings/schedule/print', { params });
