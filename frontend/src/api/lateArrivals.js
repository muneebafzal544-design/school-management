import api from './axios';
export const recordLate      = (data) => api.post('/late-arrivals', data);
export const getLateArrivals = (params) => api.get('/late-arrivals', { params });
export const getMonthlyRegister = (params) => api.get('/late-arrivals/register', { params });
export const deleteLateArrival = (id) => api.delete(`/late-arrivals/${id}`);
