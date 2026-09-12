import api from './axios';

export const getEvents    = (params = {}) => api.get('/events', { params });
export const getEventById  = (id)         => api.get(`/events/${id}`);
export const createEvent   = (data)       => api.post('/events', data);
export const updateEvent   = (id, data)   => api.put(`/events/${id}`, data);
export const deleteEvent              = (id)    => api.delete(`/events/${id}`);
export const seedNationalHolidays     = (year)  => api.post(`/events/seed-national-holidays/${year}`);
export const seedIslamicHolidays      = (year)  => api.post(`/events/seed-islamic-holidays/${year}`);
